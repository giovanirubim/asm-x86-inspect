#ifndef ASM_DEBUG_H
#define ASM_DEBUG_H

#include <stdio.h>
#include <stdint.h>

uint32_t cp_print_target;
uint32_t cp_label_beg;
uint32_t cp_label_end;
int32_t reg_eax, eax;
int32_t reg_ecx, ecx;
int32_t reg_edx, edx;
int32_t reg_ebx, ebx;
int32_t reg_esp, esp;
int32_t reg_ebp, ebp;
int32_t reg_esi, esi;
int32_t reg_edi, edi;
int16_t ax, cx, dx, bx;
int8_t ah, ch, dh, bh, al, cl, dl, bl;
uint16_t uax, ucx, udx, ubx;
uint8_t uah, uch, udh, ubh, ual, ucl, udl, ubl;

void update_alias() {
	eax = reg_eax;
	ecx = reg_ecx;
	edx = reg_edx;
	ebx = reg_ebx;
	uax = ax = eax;
	ucx = cx = ecx;
	udx = dx = edx;
	ubx = bx = ebx;
	ual = al = eax;
	ucl = cl = ecx;
	udl = dl = edx;
	ubl = bl = ebx;
	uah = ah = eax >> 8;
	uch = ch = ecx >> 8;
	udh = dh = edx >> 8;
	ubh = bh = ebx >> 8;
}

#ifndef MEM_PREFIX
	#define MEM_PREFIX ""
#endif
#ifndef ASM_FUNCTION
	#define ASM_FUNCTION asm
#endif

#define ASM_BEG ASM_FUNCTION(".intel_syntax noprefix\n"

#define ASM_END ".att_syntax prefix");
#define STORE_REGS "\
	mov " MEM_PREFIX "reg_eax, eax\n\
	mov " MEM_PREFIX "reg_ecx, ecx\n\
	mov " MEM_PREFIX "reg_edx, edx\n\
	mov " MEM_PREFIX "reg_ebx, ebx\n\
	mov " MEM_PREFIX "reg_esp, esp\n\
	mov " MEM_PREFIX "reg_ebp, ebp\n\
	mov " MEM_PREFIX "reg_esi, esi\n\
	mov " MEM_PREFIX "reg_edi, edi\n"

#define LOAD_REGS "\
	mov eax, " MEM_PREFIX "reg_eax\n\
	mov ecx, " MEM_PREFIX "reg_ecx\n\
	mov edx, " MEM_PREFIX "reg_edx\n\
	mov ebx, " MEM_PREFIX "reg_ebx\n\
	mov esp, " MEM_PREFIX "reg_esp\n\
	mov ebp, " MEM_PREFIX "reg_ebp\n\
	mov esi, " MEM_PREFIX "reg_esi\n\
	mov edi, " MEM_PREFIX "reg_edi\n"

#define PRINT(format, ...)\
	STORE_REGS ASM_END\
	update_alias();\
	printf(format, __VA_ARGS__);\
	ASM_BEG LOAD_REGS

#define INSPECT(str)\
	"jmp 101f\n"\
	"100:" str "\n"\
	"101:\n"\
	STORE_REGS\
	"lea eax, 100b\n"\
	"mov " MEM_PREFIX "cp_label_beg, eax\n"\
	"lea eax, 101b\n"\
	"mov " MEM_PREFIX "cp_label_end, eax\n"\
	ASM_END\
	dump_instruction(str);\
	ASM_BEG\
	LOAD_REGS

void dump_instruction(const char str[]) {
	unsigned char* a = (unsigned char*) cp_label_beg;
	unsigned char* b = (unsigned char*) cp_label_end;
	printf("{%s} -> ", str);
	int n = b - a, i, j;
	for (i=0; i<n; ++i) {
		printf("%02x ", a[i]);
	}
	putchar('|');
	for (i=0; i<n; ++i) {
		putchar(' ');
		unsigned char byte = a[i];
		for (j=8; j--;) {
			putchar('0'|(byte>>j)&1);
		}
	}
	putchar('\n');
}

#endif