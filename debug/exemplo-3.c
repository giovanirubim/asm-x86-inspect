#include "asmdebug.h"

int main() {
	ASM_BEG

	INSPECT(" mov eax, eax ")
	INSPECT(" mov eax, 0xaabbccdd ")

	ASM_END
}