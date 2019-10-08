#define MEM_PREFIX "_"
#include "asmdebug.h"

int print(int n) {
	ASM_BEG // Início de um código assembly

	" mov eax, [ebp+8] \n"

	PRINT("eax: %d\n", eax)

	ASM_END // Fim de um código assembly
}

int main() {
	print(15);
}