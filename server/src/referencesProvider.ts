import { CancellationToken, Location, Range, ReferenceParams, SymbolKind } from 'vscode-languageserver';
import {
	AhkSymbol, ClassNode, Context, FuncNode, FuncScope, Lexer, Property, Variable,
	ahkuris, ahkvars, find_symbol, find_symbols, lexers
} from './common';

export async function referenceProvider(params: ReferenceParams, token: CancellationToken): Promise<Location[] | undefined> {
	let result: any = [], doc = lexers[params.textDocument.uri.toLowerCase()];
	if (!doc || token.isCancellationRequested) return;
	let refs = getAllReferences(doc, doc.getContext(params.position));
	for (const uri in refs)
		result.push(...refs[uri].map(range => ({ uri, range })));
	return result;
}

export function getAllReferences(doc: Lexer, context: Context, allow_builtin = true): { [uri: string]: Range[] } | null | undefined {
	if (context.kind === SymbolKind.Null) return;
	let nodes = find_symbols(doc, context);
	if (nodes?.length !== 1)
		return;
	let name = context.text.toUpperCase();
	let references: { [uri: string]: Range[] } = {};
	let { node, uri, scope, is_this, is_global } = nodes[0];
	if (!uri || !node.selectionRange.end.character || is_this === false)
		return;

	if (!allow_builtin && (node === ahkvars[name] || uri === ahkuris.winapi))
		return null;

	if (is_this) {	// this
		let cls = node as ClassNode, range: Range[] = [];
		let decl = cls.property;
		for (let it of Object.values(decl ?? {}))
			it.children?.length && findAllVar(it as FuncNode, name, range, false, false);
		if (range.length)
			return { [lexers[uri].document.uri]: range };
		return;
	}

	switch (node.kind) {
		case SymbolKind.Field:
			if (scope) {
				let lbs = (scope as FuncNode).labels;
				if (lbs && lbs[name])
					references[lexers[uri].document.uri] = lbs[name].map(it => it.selectionRange);
			} else {
				let lbs = doc.labels;
				if (lbs[name])
					references[doc.document.uri] = lbs[name].map(it => it.selectionRange);
				for (const uri in doc.relevance) {
					lbs = lexers[uri].labels;
					if (lbs[name])
						references[lexers[uri].document.uri] = lbs[name].map(it => it.selectionRange);
				}
			}
			break;
		case SymbolKind.Function:
		case SymbolKind.Variable:
		case SymbolKind.Class:
			if (node.kind !== SymbolKind.Class || !(node as FuncNode).full.includes('.')) {
				if (is_global === true)
					scope = undefined;
				else scope = nodes[0].parent;
				let all_uris: any = { [doc.uri]: scope };
				if (uri !== doc.uri)
					all_uris[uri] = undefined;
				if (!scope)
					for (const uri in doc.relevance)
						all_uris[uri] = undefined;
				for (const uri in all_uris) {
					let rgs = findAllFromDoc(lexers[uri], name, SymbolKind.Variable, all_uris[uri]);
					if (rgs.length)
						references[lexers[uri].document.uri] = rgs;
				}
				break;
			}
		default:
			if (node.kind === SymbolKind.Class || node.static) {
				if (node.kind === SymbolKind.Class)
					name = (node as ClassNode).full.toUpperCase();
				else {
					let fn = node as FuncNode;
					let m = fn.full?.match(/^\(([^)]+)\)\sstatic\s([^(]+)($|[(\[])/);
					if (m)
						name = `${m[1]}.${m[2]}`.toUpperCase();
					else if (fn.parent?.kind === SymbolKind.Class)
						name = `${(fn.parent as FuncNode).full}.${fn.name}`.toUpperCase();
					else return;
				}
				let c = name.split('.'), l = c.length, i = 0, refs: { [uri: string]: Range[] } = {};
				for (const uri of new Set([doc.uri, ...Object.keys(doc.relevance)]))
					refs[lexers[uri].document.uri] = findAllFromDoc(lexers[uri], c[0], SymbolKind.Variable);
				while (i < l) {
					let name = c.slice(0, ++i).join('.');
					let r = find_symbol(doc, name);
					if (r?.node.kind === SymbolKind.Class) {
						for (let it of Object.values((r.node as ClassNode).property ?? {}))
							it.children?.length && findAllVar(it as FuncNode, 'THIS', refs[lexers[r.uri].document.uri] ??= [], false, false);
					}
					// TODO: search subclass's `super`
					for (const uri in refs) {
						let rgs = refs[uri], doc = lexers[uri.toLowerCase()], arr: Range[] = references[uri] ??= [];
						let document = doc.document, tokens = doc.tokens;
						next_rg:
						for (let rg of rgs) {
							let tk = tokens[document.offsetAt(rg.start)];
							if (!tk) continue;
							for (let j = i; j < l; j++) {
								if ((tk = tokens[tk.next_token_offset])?.type !== 'TK_DOT')
									continue next_rg;
								if ((tk = tokens[tk.next_token_offset])?.type !== 'TK_WORD' || tk.content.toUpperCase() !== c[j])
									continue next_rg;
							}
							arr.push({ start: document.positionAt(tk.offset), end: document.positionAt(tk.offset + tk.length) });
						}
						if (!references[uri].length)
							delete references[uri];
					}
					refs = {};
				}
				let cls = (node as FuncNode).parent, arr = references[lexers[uri].document.uri] ??= [];
				while (cls && cls.kind !== SymbolKind.Class)
					cls = (cls as FuncNode).parent;
				if (cls) {
					let name = node.name.toLowerCase(), t = [];
					for (let it of cls.children ?? []) {
						if ((it as Variable).static && it.name.toLowerCase() === name)
							t.push(it.selectionRange);
					}
					arr.unshift(...t);
				} else if (!arr.includes(node.selectionRange))
					arr.unshift(node.selectionRange);
				break;
			}
			return;
	}
	if (Object.keys(references).length)
		return references;
	return;
}

function findAllFromDoc(doc: Lexer, name: string, kind: SymbolKind, scope?: AhkSymbol) {
	let ranges: Range[] = [];
	if (kind === SymbolKind.Method || kind === SymbolKind.Property) {

	} else {
		let node = (scope ?? doc) as FuncNode, gg = !scope, assume: boolean | undefined = gg;
		let not_static = !(node?.local?.[name]?.static);
		// symbolProvider({ textDocument: { uri: doc.uri } });
		if (not_static && scope && node.declaration?.[name]?.static === null)
			not_static = false;
		if (!assume) {
			let local = node.local, dec = node.declaration;
			if (!(local?.[name] || dec?.[name]))
				assume = undefined;
		} else assume = false;
		node.children?.forEach(it => {
			if (it.name.toUpperCase() === name)
				ranges.push(it.selectionRange);
			if (it.children?.length)
				findAllVar(it as FuncNode, name, ranges, gg, gg || it.kind === SymbolKind.Function ? assume : undefined, not_static);
		});
		if (node.kind === SymbolKind.Property) {
			let prop = node as Property;
			for (let it of [prop.get, prop.set, prop.call])
				it?.children && ranges.push(...findAllFromDoc(doc, name, kind, it));
		}
	}
	return ranges;
}

function findAllVar(node: FuncNode, name: string, ranges: Range[], global: boolean, assume_glo?: boolean, not_static = true) {
	let fn_is_static = node.kind === SymbolKind.Function && node.static, f = fn_is_static || node.closure;
	let t: Variable, assume = assume_glo;
	if (fn_is_static && not_static && !global)
		return;
	if (global && node.has_this_param && ['THIS', 'SUPER'].includes(name))
		assume_glo = assume = false;
	else if (node.assume === FuncScope.GLOBAL || node.global?.[name]) {
		if (!global)
			return;
		assume_glo = assume = true;
	} else if (node.local?.[name] || ((!f || global && !assume_glo) && node.declaration?.[name])) {
		if (!global)
			return;
		assume_glo = assume = false;
	} else if (global && !assume_glo)
		if (fn_is_static && (!(t = node.declaration?.[name]) || t.kind === SymbolKind.Variable && !t.def))
			assume = true;
		else if (node.unresolved_vars?.[name])
			assume = true;

	if (not_static)
		not_static = !(node?.local?.[name]?.static);
	if (assume === global) {
		node.children?.forEach(it => {
			if (it.name.toUpperCase() === name && (it.kind !== SymbolKind.Property && it.kind !== SymbolKind.Method && it.kind !== SymbolKind.Class))
				ranges.push(it.selectionRange);
			if (it.children?.length)
				findAllVar(it as FuncNode, name, ranges, global, it.kind === SymbolKind.Function ? assume_glo : global || undefined, not_static);
		});
	} else {
		node.children?.forEach(it => {
			if (it.children?.length)
				findAllVar(it as FuncNode, name, ranges, global, global ? false : undefined, not_static);
		});
	}
}