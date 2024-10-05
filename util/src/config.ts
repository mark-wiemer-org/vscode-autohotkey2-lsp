//* Utility functions to access the config variable from either client or server
export enum CfgKey {	
	ActionWhenV1Detected = 'ActionWhenV1IsDetected',
	CallWithoutParentheses = 'Warn.CallWithoutParentheses',
	ClassNonDynamicMemberCheck = 'Diagnostics.ClassNonDynamicMemberCheck',
	Commands = 'commands',
	CommentTagRegex = 'CommentTags',
	CompleteFunctionCalls = 'CompleteFunctionParens',
	CompletionCommitCharacters = 'CompletionCommitCharacters',
	Exclude = 'Files.Exclude',
	ExtensionUri = 'extensionUri',
	Formatter = 'FormatOptions',
	InterpreterPath = 'InterpreterPath',
	LibrarySuggestions = 'AutoLibInclude',
	LocalSameAsGlobal = 'Warn.LocalSameAsGlobal',
	Locale = 'locale',
	MaxScanDepth = 'Files.ScanMaxDepth',
	ParamsCheck = 'Diagnostics.ParamsCheck',
	SymbolFoldingFromOpenBrace = 'SymbolFoldingFromOpenBrace',
	Syntaxes = 'Syntaxes',
	VarUnset = 'Warn.varUnset',
	WorkingDirectories = 'WorkingDirs',
}

export type ActionType = 'Continue' | 'Warn' | 'SkipLine' | 'SwitchToV1' | 'Stop';

export enum LibIncludeType {
	'Disabled',
	'Local',
	'User and Standard',
	'All'
}

export interface FormatOptions {
	array_style?: number
	brace_style?: number
	break_chained_methods?: boolean
	ignore_comment?: boolean
	indent_string?: string
	indent_between_hotif_directive?: boolean
	keyword_start_with_uppercase?: boolean
	max_preserve_newlines?: number
	object_style?: number
	preserve_newlines?: boolean
	space_before_conditional?: boolean
	space_after_double_colon?: boolean
	space_in_empty_paren?: boolean
	space_in_other?: boolean
	space_in_paren?: boolean
	switch_case_alignment?: boolean
	symbol_with_same_case?: boolean
	white_space_before_inline_comment?: string
	wrap_line_length?: number
}

/** Matches the contributed extension configuration */
export interface AHKLSConfig {
	locale?: string
	commands?: string[]
	extensionUri?: string
	ActionWhenV1IsDetected: ActionType
	AutoLibInclude: LibIncludeType
	CommentTags?: string
	CompleteFunctionParens: boolean
	CompletionCommitCharacters?: {
		Class: string
		Function: string
	}
	Diagnostics: {
		ClassNonDynamicMemberCheck: boolean
		ParamsCheck: boolean
	}
	Files: {
		Exclude: string[]
		MaxDepth: number
	}
	FormatOptions: FormatOptions
	InterpreterPath: string
	GlobalStorage?: string
	Syntaxes?: string
	SymbolFoldingFromOpenBrace: boolean
	Warn: {
		VarUnset: boolean
		LocalSameAsGlobal: boolean
		CallWithoutParentheses: boolean | /* Parentheses */ 1
	}
	WorkingDirs: string[]
}

/** The start of each config value in package.json */
export const configPrefix = 'AutoHotkey2';