const fs = require('fs');
const {exec} = require('child_process');

let src_path;
let asm_lines = [];
let byte_lines;
let variables;

const isLetter = chr => chr.toLowerCase() !== chr.toUpperCase();
const isDigit = chr => chr >= '0' && chr <= '9';
const getVariable = str => {
	let index = str.indexOf('_');
	if (index === -1) return null;
	if (!isLetter(str[index + 1])) return null;
	let end;
	for (end=index+2; end<str.length; ++end) {
		const chr = str[end];
		if (!isLetter(chr) && !isDigit(chr)) {
			break;
		}
	}
	return str.substring(index + 1, end);
};

const write_c_file = () => new Promise((done, fail) => {
	console.log('Creating c code...');
	let varMap = {};
	let vars = [];
	asm_lines.forEach(line => {
		let id = getVariable(line);
		if (!id || varMap[id]) return;
		varMap[id] = true;
		vars.push(id);
	});
	let code = '';
	code += '#include <stdio.h>\n';
	code += '#include <stdlib.h>\n';
	code += 'typedef unsigned char byte;\n';
	code += '#define asm_begin "\\n.intel_syntax noprefix\\n"\n';
	code += '#define asm_end "\\n.att_syntax prefix\\n"\n';
	if (vars.length) {
		code += 'int ' + vars.join(', ') + ';\n';
	}
	code += 'asm(asm_begin\n';
	const n = asm_lines.length;
	asm_lines.forEach((line, i) => {
		line = `asm_reference_${i}: ${line}\n`;
		code += `\t${JSON.stringify(line)}\n`;
	});
	code += `\t"asm_reference_${n}:"\n`
	code += 'asm_end);\n';
	for (let i=0; i<=n; ++i) {
		code += `byte* get_asm_reference_${i}() {\n`;
		code += `\tasm(asm_begin "lea eax, asm_reference_${i}" asm_end);\n`;
		code += '}\n';
	}
	code += 'int main(int argc, char const *argv[]) {\n';
	code += `\tbyte* array[${n+1}] = {\n`;
	for (let i=0; i<=n; ++i) {
		code += `\t\tget_asm_reference_${i}()${i==n?'\n':',\n'}`;
	}
	code += '\t};\n';
	code += '\tprintf("{\\"instructions\\": [");\n';
	code += `\tfor (int i=0; i<${n}; ++i) {\n`;
	code += '\t\tif (i) printf(", ");\n';
	code += '\t\tprintf("[");\n';
	code += '\t\tbyte* a = array[i];\n';
	code += '\t\tbyte* b = array[i+1];\n';
	code += '\t\tint n = b - a;\n';
	code += '\t\tfor (int j=0; j<n; ++j) {\n';
	code += '\t\t\tif (j) printf(", ");\n';
	code += '\t\t\tprintf("%d", a[j]);\n';
	code += '\t\t}\n';
	code += '\t\tprintf("]");\n';
	code += '\t}\n';
	code += '\tprintf("], \\"vars\\": [");\n';
	vars.forEach((id, i) => {
		code += `\tprintf("${i?', ':''}[\\"${id}\\", %d]", (int)&${id});\n`;
	});
	code += '\tprintf("]}");\n';
	code += '\treturn 0;\n';
	code += '};';
	fs.writeFile('asm_scanner.c', code, error => {
		if (!error) {
			done();
		} else {
			fail('Fail to write to file "asm_scanner.c"');
		}
	});
});

const compile = () => new Promise((done, fail) => {
	const line = 'gcc -m32 asm_scanner.c -o asm_scanner.exe';
	console.log('Compiling...');
	exec(line, (error, b, msg) => {
		if (error) {
			if (msg) {
				fail('Fail to compile asm_scanner.c\nError:\n' + msg);
			} else {
				fail('Fail to compile asm_scanner.c\n');
			}
		} else {
			done();
		}
	});
});

const run = () => new Promise((done, fail) => {
	exec('asm_scanner.exe', (error, output) => {
		if (error) {
			fail('Runtime error in asm_scanner.exe');
		} else {
			json = JSON.parse(output);
			byte_lines = json.instructions;
			variables = json.vars;
			done();
		}
	});
});

const stringifyTable = table => {
	const nCols = table[0].length;
	const max = new Array(nCols).fill(0);
	table.forEach(row => {
		row.forEach((cell, i) => {
			const len = cell.toString().length;
			max[i] = Math.max(max[i], len);
		});
	});
	let border = '+';
	for (let i=0; i<nCols; ++i) {
		border += '-'.repeat(max[i] + 2) + '+';
	}
	let res = border + '\n';
	table.forEach(row => {
		let line = [];
		row.forEach((cell, i) => {
			let str = cell.toString();
			str += ' '.repeat(max[i] - str.length);
			line.push(str);
		});
		res += `| ${ line.join(' | ') } |` + '\n';
		res += border + '\n';
	});
	return res.substr(0, res.length - 1);
};

const stringifyBytes = (bytes, base) => {
	let len = Math.round(Math.log(256)/Math.log(base));
	let str = '';
	bytes.forEach((byte, i) => {
		if (i) str += ' ';
		byte = byte.toString(base);
		str += '0'.repeat(len - byte.length) + byte;
	});
	return str;
};

const getDstPath = () => {
	let i = src_path.lastIndexOf('.');
	if (i == -1) return src_path + '-out.txt';
	return src_path.substr(0, i) + '-out.txt';
};

const generateOutput = () => new Promise((done, fail) => {
	let table = [['INSTRUCTION', 'HEX', 'BIN']];
	asm_lines.forEach((line, i) => {
		const hex = stringifyBytes(byte_lines[i], 16);
		const bin = stringifyBytes(byte_lines[i], 2);
		table.push([line, hex, bin]);
	});
	let output = stringifyTable(table) + '\n';
	if (variables.length) {
		vint = new Uint32Array(1);
		vbyte = new Uint8Array(vint.buffer, 0, 4);
		table = [['VARIABLE', 'ADDRESS (HEX)', 'ADDRESS (BIN)']];
		variables.forEach(row => {
			const [id, addr] = row;
			vint[0] = addr;
			table.push([
				id,
				stringifyBytes(vbyte, 16),
				stringifyBytes(vbyte, 2)
			]);
		});
		output += '\n' + stringifyTable(table);
	}
	const dst_path = getDstPath();
	console.log(`Creating "${dst_path}"...`);
	fs.writeFile(dst_path, output, error => {
		if (error) {
			fail('Fail to create output!');
		} else {
			done();
		}
	});
});

const processTextFile = text => new Promise((done, fail) => {
	asm_lines.length = 0;
	text.split('\n').forEach(line => {
		line = line.split('#')[0].trim();
		if (line) asm_lines.push(line);
	});
	write_c_file()
		.then(compile)
		.then(run)
		.then(generateOutput)
		.then(done)
		.catch(fail);
});

const {argv} = process;
const argn = argv.length;
const processFile = index => new Promise((done, fail) => {
	if (index >= argn) return done();
	src_path = argv[index];
	if (index > 2) console.log('');
	console.log(`File: "${src_path}"`);
	fs.readFile(src_path, (error, data) => {
		if (error) {
			fail(`Fail to open "${src_path}"`);
		} else {
			data = data.toString('utf8');
			processTextFile(data)
				.then(() => processFile(index + 1))
				.then(done)
				.catch(fail);
		}
	});
});
if (argn <= 2) {
	console.log('No input files');
} else {
	processFile(2)
		.then(() => console.log('\nDone!'))
		.catch(error => console.error(error));
}