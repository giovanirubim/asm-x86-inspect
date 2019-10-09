#ifndef ASM_DEBUG_H
#define ASM_DEBUG_H

#include <stdio.h>
#include <stdint.h>

int32_t cp_label_beg = 0, _cp_label_beg = 0;
int32_t cp_label_end = 0, _cp_label_end = 0;
int32_t reg_eax = 0, _reg_eax = 0, eax;
int32_t reg_ecx = 0, _reg_ecx = 0, ecx;
int32_t reg_edx = 0, _reg_edx = 0, edx;
int32_t reg_ebx = 0, _reg_ebx = 0, ebx;
int32_t reg_esp = 0, _reg_esp = 0, esp;
int32_t reg_ebp = 0, _reg_ebp = 0, ebp;
int32_t reg_esi = 0, _reg_esi = 0, esi;
int32_t reg_edi = 0, _reg_edi = 0, edi;
int16_t ax, cx, dx, bx;
int8_t ah, ch, dh, bh, al, cl, dl, bl;
uint16_t uax, ucx, udx, ubx;
uint8_t uah, uch, udh, ubh, ual, ucl, udl, ubl;

void update_alias() {
	eax = reg_eax | _reg_eax;
	ecx = reg_ecx | _reg_ecx;
	edx = reg_edx | _reg_edx;
	ebx = reg_ebx | _reg_ebx;
	esp = reg_esp | _reg_esp;
	ebp = reg_ebp | _reg_ebp;
	esi = reg_esi | _reg_esi;
	edi = reg_edi | _reg_edi;
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

#ifndef ASM_FUNCTION
	#define ASM_FUNCTION asm
#endif

#define ASM_BEG ASM_FUNCTION(".intel_syntax noprefix\n"

#define ASM_END ".att_syntax prefix");
#define STORE_REGS "\
	mov _reg_eax, eax\n\
	mov _reg_ecx, ecx\n\
	mov _reg_edx, edx\n\
	mov _reg_ebx, ebx\n\
	mov _reg_esp, esp\n\
	mov _reg_ebp, ebp\n\
	mov _reg_esi, esi\n\
	mov _reg_edi, edi\n"

#define LOAD_REGS "\
	mov eax, _reg_eax\n\
	mov ecx, _reg_ecx\n\
	mov edx, _reg_edx\n\
	mov ebx, _reg_ebx\n\
	mov esp, _reg_esp\n\
	mov ebp, _reg_ebp\n\
	mov esi, _reg_esi\n\
	mov edi, _reg_edi\n"

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
	"mov _cp_label_beg, eax\n"\
	"lea eax, 101b\n"\
	"mov _cp_label_end, eax\n"\
	ASM_END\
	dump_instruction(str);\
	ASM_BEG\
	LOAD_REGS

void dump_instruction(const char str[]) {
	unsigned char* a;
	unsigned char* b;
	uint32_t ptr_a = (cp_label_beg | _cp_label_beg);
	uint32_t ptr_b = (cp_label_end | _cp_label_end);
	*(uint32_t*)(&a) = ptr_a;
	*(uint32_t*)(&b) = ptr_b;
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