const fs = require('fs');
const {exec} = require('child_process');

let run_line;
let compile_line;
let src_path;
let asm_lines = [];
let byte_lines;
let variables;
let first_addr;

if (process.platform === 'win32') {
	run_line = 'asm_scanner.exe';
	compile_line = 'gcc -m32 asm_scanner.c -o asm_scanner.exe';
} else {
	run_line = './asm_scanner';
	compile_line = 'gcc -m32 asm_scanner.c -o asm_scanner';
}

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
	code += '#define asm_begin asm("\\n.intel_syntax noprefix\\n"\n';
	code += '#define asm_end "\\n.att_syntax prefix\\n");\n';
	if (vars.length) {
		code += 'int ' + vars.join(', ') + ';\n';
	}
	code += 'asm_begin\n';
	const n = asm_lines.length;
	asm_lines.forEach((line, i) => {
		line = `asm_reference_${i}: ${line}\n`;
		code += `\t${JSON.stringify(line)}\n`;
	});
	code += `\t"asm_reference_${n}:"\n`
	code += 'asm_end\n';
	for (let i=0; i<=n; ++i) {
		code += `byte* get_asm_reference_${i}() {`;
		code += `asm_begin "lea eax, asm_reference_${i}" asm_end`;
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
	code += '\tprintf("], \\"first_addr\\": %d}", array[0]);\n';
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
	console.log('Compiling...');
	exec(compile_line, (error, b, msg) => {
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
	console.log('Running...');
	exec(run_line, (error, output) => {
		if (error) {
			fail('Runtime error in asm_scanner.exe');
		} else {
			json = JSON.parse(output);
			byte_lines = json.instructions;
			variables = json.vars;
			first_addr = json.first_addr;
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

const stringifyWord = (value, base) => {
	let bytes = [];
	for (let i=0; i<4; ++i) {
		bytes.push((value >> (i*8)) & 255);
	}
	return stringifyBytes(bytes, base);
};

const getDstPath = () => {
	let i = src_path.lastIndexOf('.');
	if (i == -1) return src_path + '-out.txt';
	return src_path.substr(0, i) + '-out.txt';
};

const generateOutput = () => new Promise((done, fail) => {
	let table = [['ADDR (HEX)', 'ADDR (DEC)', 'INSTRUCTION', 'HEX', 'BIN']];
	let addr = first_addr;
	asm_lines.forEach((line, i) => {
		const hex = stringifyBytes(byte_lines[i], 16);
		const bin = stringifyBytes(byte_lines[i], 2);
		table.push([
			stringifyWord(addr, 16),
			addr,
			line,
			hex,
			bin
		]);
		addr += byte_lines[i].length;
	});
	let output = stringifyTable(table) + '\n';
	if (variables.length) {
		table = [['VARIABLE', 'ADDR (HEX)', 'ADDR (BIN)']];
		variables.forEach(row => {
			let [id, addr] = row;
			table.push([
				id,
				stringifyWord(addr, 16),
				stringifyWord(addr, 2)
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