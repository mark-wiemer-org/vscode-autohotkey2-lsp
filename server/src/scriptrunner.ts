import { execSync, spawnSync } from 'child_process';
import { ahkpath_cur, isWindows } from './common';
import { lstatSync, readlinkSync } from 'fs';
import { resolve } from 'path';

export function runscript(script: string) {
	const executePath = resolvePath(ahkpath_cur, true);
	if (!executePath)
		return;
	const process = spawnSync(`"${executePath}" /CP65001 /ErrorStdOut=utf-8 *`, [], { cwd: executePath.replace(/[\\/].+?$/, ''), shell: true, input: script });
	if (process)
		return (process.stdout ?? '').toString();
}

export function existsSync(path: string): boolean {
	try {
		lstatSync(path);
	} catch (err) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		if ((err as any)?.code === 'ENOENT')
			return false;
	}
	return true;
}

export function resolvePath(path: string, resolveSymbolicLink = false): string {
	if (!path)
		return '';
	const paths: string[] = [];
	if (!path.includes(':'))
		paths.push(resolve(path));
	if (isWindows && !/[\\/]/.test(path))
		paths.push(execSync(`where ${path}`, { encoding: 'utf-8' }).trim());
	paths.push(path);
	for (let path of paths) {
		if (!path) continue;
		try {
			if (lstatSync(path).isSymbolicLink() && resolveSymbolicLink)
				path = resolve(path, '..', readlinkSync(path));
			return path;
		} catch {
			continue;
		}
	}
	return '';
}