#include <stdio.h>
#include <stdlib.h>
typedef unsigned char byte;
#define asm_begin asm("\n.intel_syntax noprefix\n"
#define asm_end "\n.att_syntax prefix\n");
asm_begin
	"asm_reference_0: mov eax, [0xaabbccdd]\n"
	"asm_reference_1:"
asm_end
byte* get_asm_reference_0() {asm_begin "lea eax, asm_reference_0" asm_end}
byte* get_asm_reference_1() {asm_begin "lea eax, asm_reference_1" asm_end}
int main(int argc, char const *argv[]) {
	byte* array[2] = {
		get_asm_reference_0(),
		get_asm_reference_1()
	};
	printf("{\"instructions\": [");
	for (int i=0; i<1; ++i) {
		if (i) printf(", ");
		printf("[");
		byte* a = array[i];
		byte* b = array[i+1];
		int n = b - a;
		for (int j=0; j<n; ++j) {
			if (j) printf(", ");
			printf("%d", a[j]);
		}
		printf("]");
	}
	printf("], \"vars\": [");
	printf("], \"first_addr\": %d}", array[0]);
	return 0;
};