import commonjs from 'rollup-plugin-commonjs'
import globals from 'rollup-plugin-node-globals'
import builtins from 'rollup-plugin-node-builtins'
import resolve from 'rollup-plugin-node-resolve'
import babel from 'rollup-plugin-babel'
import {terser} from 'rollup-plugin-terser'
import {header} from 'rollup-plugin-header'
import pkg from './package.json'; // Import package.json

export default [
    {
        input: 'src/index.js',
        plugins: [
            resolve({browser: true}),
            commonjs(),
            builtins(),
            globals(),
            babel({
			           plugins: [
				               '@babel/plugin-syntax-dynamic-import'
			           ]
		        }),
            terser(),
            header({
                header: `/* Version ${pkg.version} */\n`, // Include the version from package.json
            })
        ],
        output: // ES module version, for modern browsers
        {
            dir: "dist/module",
            format: "es",
            sourcemap: true
        }
    },
    {
        input: 'src/index.js',
        plugins: [
            resolve({browser: true}),
            commonjs(),
            builtins(),
            globals(),
            babel({
			           plugins: [
				               '@babel/plugin-syntax-dynamic-import'
			           ]
		        }),
            terser(),
            header({
                header: `/* Version ${pkg.version} */\n`, // Include the version from package.json
            })
        ],
        output: // SystemJS version, for older browsers
        {
            dir: "dist/nomodule",
            format: "system",
            sourcemap: true
        },
    },
    {
        input: 'src/index.js',
        plugins: [
            resolve({browser: true}),
            commonjs(),
            builtins(),
            globals(),
            babel({
			           plugins: [
				               '@babel/plugin-syntax-dynamic-import'
			           ]
		        }),
            terser(),
            header({
                header: `/* Version ${pkg.version} */\n`, // Include the version from package.json
            })
        ],
        output: // CJS version
        {
            dir: "dist",
            format: "cjs",
            sourcemap: true
        }
    }
]
