#include "asmdebug.h"

int soma_dig(int x) {
	ASM_BEG

	" mov eax, [ebp+8] \n"
	" mov ecx, 10 \n" // Deixa 10 em ecx porque não dá para fazer 'idiv 10'
	" mov ebx, 0 \n" // ebx acumula o resultado

	" ini: \n" // Início do loop
	" cdq \n" // Estende o bit de sinal de EAX em EDX para fazer a divisão
	" idiv ecx \n"
	
	PRINT("Acumulado: %d\n", ebx)
	PRINT("Divisao: %d, Mod: %d\n", eax, edx)
	
	" add ebx, edx \n" // Soma o mod da divisão em ebx
	
	// Continua o loop enquanto eax não for zero
	" cmp eax, 0 \n"
	" jne ini \n"

	// Deixa o resultado em eax para o retorno
	" mov eax, ebx \n"

	ASM_END
}

int main() {
	int x;
	printf("Entre com um inteiro: ");
	scanf("%d", &x);
	printf("Soma: %d\n", soma_dig(x));
}