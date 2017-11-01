/* Copyright (C) 2017 David O'Riva. MIT Licenseø.
 *********************************************************/

/*
================================================================================

DEET

================================================================================
*/
(function() {

function _DEET()
{
	throw new ReferenceError( "DEET cannot be instantiated" );
}

DEET = _DEET;
var _static = _DEET;

//var _public = _DEET.prototype;
//window.DEET = _DEET;
//_public.toString = function() { return "[object DEET]"; }

_static.version = "0.3";

_static.builtinTokens = {
	 nul: "\u0000"
	,tab: "\t"
	,lf: "\n"
	,cr: "\r"
	,crlf: "\r\n"
	,obr: "{"
	,cbr: "}"
	,quot: "\""
	,apos: "'"
	,amp: "&"
	,lt: "<"
	,gt: ">"
};

/*
=====================
isArray
=====================
*/
var isArray  = _static.isArray = function( v )
{
	return v !== null && typeof v == 'object' &&
		Object.prototype.toString.apply(v) == "[object Array]";
}

/*
=====================
isObject

Differentiates Object from Array/Date/Regexp/etc.
=====================
*/
var isObject = _static.isObject = function( v )
{
	return v !== null && typeof v == 'object' &&
		Object.prototype.toString.apply(v) == "[object Object]";
}

/*
=====================
ParseError
=====================
*/
_static.ParseError = function( message )
{
	Error.apply( this, [ message ] );
}
_static.ParseError.prototype = Error;

/*
=====================
expandTabs

Expands TAB characters to spaces in a string, given a tab width.
=====================
*/
_static.expandTabs = function( str, tabwidth )
{
	// method 2 - minimize function calls
	if (str.indexOf('\t') < 0) {
		return str;
	}	
	var parts = str.split( '\t' );
	var spaces = _static.expandTabs.spaces;
	if (!spaces) {
		spaces = _static.expandTabs.spaces = [];
	}
	while (tabwidth >= spaces.length) {
		spaces[ spaces.length ] = " ".repeat( spaces.length );
	}	
	var col = 0;
	var out = [];
	for (let i = 0, ic = parts.length - 1; i < ic; i++) {
		let pl = parts[i].length;
		if (pl) {
			out.push( parts[i] );
			col += pl;
		}
		let add = tabwidth - col % tabwidth;
		out.push( spaces[ add ] );
		col += add;
	}
	out.push( parts[ parts.length - 1 ] );
	return out.join( "" );

	/* TODO: profile these
	// method 1 - classic
	let next = str.indexOf( '\t' );
	if (next < 0) {
		return str;
	}
	let len = str.length;
	let out = [];
	let off = 0;
	let col = 0;
	let spaces = _static.expandTabs.spaces;
	if (!spaces) {
		spaces = _static.expandTabs.spaces = [];
	}
	while (tabwidth >= spaces.length) {
		spaces[ spaces.length ] = " ".repeat( spaces.length );
	}
	for (;next >= 0;) {
		if (next > off) {
			out.push( str.substr( off, next - off ) );
			col += next - off;
		}
		off = next;
		let add = tabwidth - col % tabwidth;
		col += add;
		out.push( spaces[add] );
		next = str.indexOf( '\t', ++off );
		while (next == off) {
			out.push( spaces[tabwidth] );
			next = str.indexOf( '\t', ++off );
			col += tabwidth;
		}
	}
	if (off < len) {
		out.push( str.substr( off ) );
	}
	return out.join( "" );
	*/
}

/*
=====================
replaceTokens
=====================
*/
_static.replaceTokens = function( str, extraTokens )
{
	const seg = /\{\{|\}\}|\{(?:[^{}]*|\{[^{}]*\})*\}/g;
	const toks = _static.builtinTokens;
	str = str.replace( seg, function( tok ) {
		if (tok == "}}") {
			return "}";
		} else if (tok == "{{") {
			return "{";
		}
		let t = tok.substr( 1, tok.length - 2 ).toLowerCase();
		if (toks[t]) {
			return toks[t];
		} else if (t[0] == "#") {
			let v;
			if (t.length > 3 && t[1] == '0') {
				if (t[2] == 'x') {
					v = Number.parseInt( t.substr( 3 ), 16 );
				} else if (t[2] == 't') {
					v = Number.parseInt( t.substr( 3 ), 10 );
				} else if (t[2] == 'y') {
					v = Number.parseInt( t.substr( 3 ), 2 );
				} else if (t[2] == 'o') {
					v = Number.parseInt( t.substr( 3 ), 8 );
				} else {
					v = Number.parseInt( t.substr( 1 ), 16 );
				}
			} else {
				v = Number.parseInt( t.substr( 1 ), 16 );
			}
			if (!isNaN( v )) {
				return String.fromCharCode( v );
			}
		}
		return tok;
	} );
	return str;
}

/*
=====================
parseString
=====================
*/
_static.parseString = function( str, tokens )
{
	str = str.trim();
	let sl = str.length;
	if (str[0] != '"' || str[ sl - 1 ] != '"') {
		throw new DEET.ParseError( "invalid string" );
	}
	str = str.substr( 1, sl - 2 );
	str = str.replace( /""/g, '"' );
	return DEET.replaceTokens( str, tokens );
}

/*
=====================
stripBlockComments

Removes any comments found in a block of text. Input may be a string or
array. If array, it is modified in place.
Returns an array of lines with all comments removed.
Comments must follow all DEET guidelines for surrounding whitespace and content.
=====================
*/
_static.stripBlockComments = function( text )
{
	if (typeof text == "string") {
		text = text.split( "\n" );
	}
	var re = /((?:^| |\t)#(?:#{0,2}(?: .*|$)|[-=#]{3,}.*))$/;
	for (let i = 0, ic = text.length; i < ic; ++i) {
		let c = re.exec( text[ i ] );
		if (c) {
			text[ i ] = text[ i ].substr( 0, text[ i ].length - c[0].length );
		}
	}
	return text;
}

/*
=====================
parseHexBlock

Removes comments, collapses and converts a hex block to an Int8Array.
Comments are stripped, then all whitespace is removed. Whitespace consists
of the following characters:

    (space) (tab) (cr) (lf) , : _

If the result contains non-hex characters then a ParseError is thrown.
If the result has an odd number of characters, the last nibble is filled with
0 bits.
If the result is empty, an empty Uint8Array is returned.
=====================
*/
_static.parseHexBlock = function( text )
{
	text = DEET.stripBlockComments( text );

	text = text.join( "" ).replace( /[ \t\r\n,:_]+/g, "" );
	if (/[^0-9a-fA-F]/.exec( text )) {
		throw new _static.ParseError( "invalid hex string" );
	}
	var l = text.length;
	var out = new Uint8Array((l + 1) / 2);

	for (let i = 0; i < l; i += 2) {
		out[ i >> 1 ] = Number.parseInt( text.substr( i, 2 ), 16 );
	}
	if (l & 1) {
		out[ l >> 1 ] = Number.parseInt( text.substr( l - 1, 1 ) + "0", 16 );
	}
	return out;
}

/*
=====================
parseBase64Block

Removes comments, collapses and converts a base-64 block to an Int8Array.
Comments are stripped, then all whitespace is removed. Whitespace consists
of the following characters:

    (space) (tab) (cr) (lf)

If the result contains non-base-64 characters then a ParseError is thrown.
If the result has the wrong number of characters, '=' padding is appended to
fix it.
If the result is empty, an empty Uint8Array is returned.
=====================
*/
_static.parseBase64Block = function( text )
{
	text = DEET.stripBlockComments( text );

	text = text.join( "" ).replace( /[ \t\r\n]+/g, "" );
	var l = text.length;
	if (l & 3) {
		text += "===".substr( 0, 4 - (l & 3) );
	}
	try {
		text = atob( text );
	} catch (e) {
		throw new _static.ParseError( "invalid base-64 string" );
	}
	l = text.length;
	var out = new Uint8Array(l);
	for (let i = 0; i < l; i++) {
		out[ i ] = text.charCodeAt( i );
	}
	return out;
}

/*
=====================
parser (subobject)

The parser object maintains state during the parsing of a DEET file. It's
pretty simple, but allows the parse itself to be cleanly broken into functional
sections.
=====================
*/
var parser = _static.parser = function( text, options )
{
	this.lines = text.split( "\n" );
	this.options = options || {};
	this.stack = [];
	this.error = null;
	this.sections = {};
	this.def = {
		 level: -1
		,wantVal: true
		,isRoot: true
		,tabs: this.options.tabWidth || 4
		,metadefs: {}
	};
	if (this.options.defaultSection) {
		this.def = {
			 level: -1
			,isSection: true
			,val: this.sections
			,name: this.options.defaultSection || "main"
			,tabs: this.options.tabWidth || 4
			,metadefs: {}
		};
	}
	this.line = 0;
}

/*
=====================
Various regular expressions
=====================
*/
parser.regex = {
	 str: "(?:\"(?:[^\"]|\"\")*\"|c\"(?:\\.|[^\\\"])*\"|r\"[^\"]*\")"
	,key: "(?:({-str-} *|[-a-zA-Z0-9~!@#$%^&*_+[\\]{};: <>,./?|\\\\]+?)(: +|:$))"
	,comment: "(?:#{1,3}(?: .*|$)|#[-=#]{3,}.*)"
	,section: "^={3,} ([-_a-zA-Z][-_a-zA-Z0-9]*) ={3,} *{-comment-}?$"
	,meta: "\\(\\([-_.:a-zA-Z0-9]+\\)\\)"
	,metadef: " *(?:: *(.*?)? *{-comment-}?)$"
	,prevalue: "^( +)?(- +)?{-key-}?({-comment-})?({-meta-})?"
	,num: "[-+]?(?:[0-9]+(?:\.[0-9]+)?(?:e[+-]?[0-9]+)?|0x[0-9a-fA-F]+|0t[0-9]+|0l[0-7]+|0y[01]+)"
	,blockspec: "[|>][0-9]*(?:[-+bjxy]|json|csv|hex|base-?64)?"
	,blockspec2: "^([|>])([0-9]*)([-+bjxy]|json|csv|hex|base-?64)?$"
	,val: "^(?:(null|false|true)|({-num-})|({-str-})|({-blockspec-})|(.*?))( *| +{-comment-})\r?$"
	,blockline: "^( *)(.*?)\r?$"
	,justcomment: "^{-comment-}$"
};

/*
=====================
parser.prepRegexStr
=====================
*/
parser.prepRegexStr = function( re )
{
	if (!(re in parser.regex_str)) {
		parser.regex_str[re] = 
			parser.regex[re].replace( /\{-[a-z0-9]+-\}/g, function( tok ) {
			return parser.prepRegexStr( tok.substr( 2, tok.length - 4 ) );
		} );
	}
	return parser.regex_str[re];
}

/*
=====================
parser.prep
=====================
*/
parser.prep = function()
{
	if (parser.regex._prepped_) {
		return;
	}
	parser.regex_str = {};
	re = { _prepped_: true };
	for (let k in parser.regex) {
		re[ k ] = new RegExp( parser.prepRegexStr( k ) );
	}
	parser.regex = re;
}

/*
=====================
parser.run
=====================
*/
parser.prototype.run = function( /* until */ )
{
	parser.prep();

	const numlines = this.lines.length;
	const expandTabs = DEET.expandTabs;
	const opt = this.options;
	const re = parser.regex;
	var line;

	this.metatags = [];

	for (this.line = 0; this.line < numlines && !this.error; this.line++) {
		const l = expandTabs( this.lines[this.line], this.def.tabs );
		const ll = l.length;
		let indent = 0;

		if (ll && l[0] == '=') {
			let got = re.section.exec( l );
			if (got) {
				this.defSection( got[1] );
				continue;
			}
		}

		for (;indent < ll && !this.error;) {
			let got = re.prevalue.exec( l.substr( indent ) );
			if (!got || got[0].length == 0) {
				this.defValue( indent, l );
				break;
			}
			if (got[1]) {
				indent += got[1].length;
			}
			if (got[2]) {
				this.defElement( indent );
				indent += got[2].length;
			}
			if (got[3]) {
				this.defKey( indent, got[3] );
				indent += got[3].length + got[4].length;
			}
			if (got[5]) {
				// comment ends scan
				break;
			}
			if (got[6]) {
				let oi = indent;
				let tag = got[6].substr( 2, got[6].length - 4 );
				let md = re.metadef.exec( l.substr( indent ) );
				if (md) {
					this.defMeta( tag, md[1], indent );
					// meta define always ends line
					break;
				}
				this.metatags.push( tag );
				indent += got[6].length;
			}
		}
	}
	if (this.error) {
		this.errorMessage = "Error: line " + (line) + ": " + this.error;
	}
	return true;
}

/*
=====================
parser.getError
=====================
*/
parser.prototype.getError = function()
{
	if (this.error) {
		return this.errorMessage;
	}
}

/*
=====================
parser.getResult
=====================
*/
parser.prototype.getResult = function( indent )
{
	if (this.error) {
		return null;
	}
	return this.stack.length ? this.stack[0].val : this.def.val;
}

/*
=====================
parser.unwind
=====================
*/
parser.prototype.unwind = function( indent )
{
	var def = this.def;
	while (indent <= def.level) {
		if (def.wantValue) {
			this.assignValue( def, null );
		}
		if (indent == def.level) {
			def.wantValue = false;
			break;
		}
		if (!this.stack.length) {
			this.error = "indent underflow";
			return;
		}
		def = this.def = this.stack.pop();
	}
	return def;
}

/*
=====================
parser.defSection
=====================
*/
parser.prototype.defSection = function( name )
{
	if (this.options.noSections) {
		this.error = "section header not allowed";
		return;
	}
	var def = this.unwind( -1 );
	if (!this.sections) {
		this.sections = {};
	}
	this.def = {
		 level: -1
		,val: this.sections
		,name: name
		,wantVal: true
		,isSection: true
		,tabs: this.def.tabs
	};
}


/*
=====================
parser.defMeta
=====================
*/
parser.prototype.defMeta = function( tag, val, indent )
{
	if (this.metatags.length) {
		this.error = "meta meta definition not allowed";
		return;
	}
	// TODO: check ambiguity? if (indent > def.level) {
	this.def.metadefs[ tag ] = val;
	if (tag == "deet-tabs") {
		this.def.tabs = val * 1 || 4;
	}
	if (this.options.meta) {
		var func = this.options.meta[ "*" + tag ];
		if (typeof func == "function") {
			func( val, tag, mdef );
		} else if (typeof func == "string") {
			if (typeof window[func] == "function") {
				window[func]( val, tag, mdef );
			}
		}
	}
}

/*
=====================
parser.getMetaDef
=====================
*/
parser.prototype.getMetaDef = function( tag )
{
	if (tag in this.def.metadefs) {
		return this.def.metadefs[ tag ];
	}
	for (scan = this.stack.length - 1; scan >= 0; --scan) {
		if (tag in this.stack[ scan ].metadefs) {
			let tv = this.stack[ scan ].metadefs[ tag ];
			this.def.metadefs[ tag ] = tv;		// cache it
			return tv;
		}
	}
}

/*
=====================
parser.applyMeta
=====================
*/
parser.prototype.applyMeta = function( val, tags )
{
	if (this.options.meta) {
		for (let i = tags.length - 1; i >= 0; i-- ) {
			var tag = tags[i];
			var mdef = this.getMetaDef( tag );
			var func = this.options.meta[ tag ];
			if (typeof func == "function") {
				val = func( val, tag, mdef );
			} else if (typeof func == "string") {
				if (typeof window[func] == "function") {
					val = window[func]( val, tag, mdef );
				}
			}
		}
	}
	return val;
}

/*
=====================
parser.applyMeta
=====================
*/
parser.prototype.applyMeta = function( val, tags )
{
	if (this.options.meta) {
		for (let i = tags.length - 1; i >= 0; i-- ) {
			var tag = tags[i];
			var mdef = this.getMetaDef( tag );
			var func = this.options.meta[ tag ];
			if (typeof func == "function") {
				val = func( val, tag, mdef );
			} else if (typeof func == "string") {
				if (typeof window[func] == "function") {
					val = window[func]( val, tag, mdef );
				}
			}
		}
	}
	return val;
}

/*
=====================
parser.assignValue
=====================
*/
parser.prototype.assignValue = function( def, val )
{
	if (this.metatags.length) {
		val = this.applyMeta( val, this.metatags );
		this.metatags = [];
	}
	if (def.isArray) {
		def.val.push( val );
	} else if (def.isMap) {
		if (def.key in def.val) {
			if (this.options.mapReplace) {
				def.val[ def.key ] = val;
			} else if (this.options.mapMultiple) {
				if (!def.multi) {
					def.multi = {};
				}
				if (!def.multi[ def.key ]) {
					def.val[ def.key ] = [ def.val[ def.key ] ];
					def.multi[ def.key ] = true;
				}
				def.val[ def.key ].push( val );
			} else {
				this.error = "unexpected duplicate key";
			}
		} else {
			def.val[ def.key ] = val;
		}
		def.val[ def.key ] = val;
	} else if (def.isSection) {
		def.val[ def.name ] = val;
	} else {
		def.val = val;
	}
}


/*
=====================
parser.defElement
=====================
*/
parser.prototype.defElement = function( indent )
{
	var def = this.unwind( indent );
	if (this.error)  return;
	if (def.level == indent && def.isArray) {
		if (this.metatags.length) {
			this.error = "misplaced metadata";
			return;
		}
		def.wantVal = true;
	} else if (indent > def.level && def.wantVal) {
		let v = [];
		let tags = this.metatags;
		if (tags.length) {
			this.metatags = [];
		}
		if (!def.isRoot) {
			this.assignValue( def, v );
			this.stack.push( def );
		}
		let md = {};
		this.def = {
			 level: indent
			,val: v
			,isArray: true
			,wantVal: true
			,metadefs: md
			,tabs: this.def.tabs
		};
		if (tags.length) {
			this.def.metatags = tags;
		}
	} else {
		this.error = "unexpected array element";
	}
}

/*
=====================
parser.defKey
=====================
*/
parser.prototype.defKey = function( indent, key )
{
	var def = this.unwind( indent );
	if (this.error)  return;
	if (key[0] == "\"") {
		key = DEET.parseString( key );
	}
	if (def.level == indent && def.isMap) {
		def.key = key;
		def.wantVal = true;
		if (this.metatags.length) {
			this.error = "misplaced metadata";
			return;
		}
	} else if (indent > def.level && def.wantVal) {
		let v = {};
		let tags = this.metatags;
		if (tags.length) {
			this.metatags = [];
		}
		if (!def.isRoot) {
			this.assignValue( def, v );
			this.stack.push( def );
		}
		let md = {};
		md.prototype = this.def.metadefs;
		this.def = {
			 level: indent
			,val: v
			,isMap: true
			,wantVal: true
			,key: key
			,metadefs: md
			,tabs: this.def.tabs
		};
		if (tags.length) {
			this.def.metatags = tags;
		}
	} else {
		this.error = "unexpected key";
	}
}

/*
=====================
parser.prototype.defValue
=====================
*/
parser.prototype.defValue = function( indent, line )
{
	var def = this.unwind( indent );
	if (this.error)  return;
	if (!def.wantVal) {
		this.error = "unexpected value";
		return;
	}
	let v = parser.regex.val.exec( line.substr( indent ) );
	if (v[1]) {
		v = (v[1] == "null") ? null :
			(v[1] == "true") ? true :
			(v[1] == "false") ? false : 
				null;
	} else if (v[2]) {
		v = v[2] * 1;
	} else if (v[3]) {
		v = DEET.parseString( v[3] );
	} else if (v[4]) {
		v = this.readBlock( indent, v[4] );
		if (this.error) {
			return;
		}
	} else if (v[5]) {
		v = v[5];
	} else {
		this.error = "cannot parse value";
		return;
	}
	this.assignValue( def, v );
	def.wantVal = false;		
}


/*
=====================
parser.prototype.readBlock
=====================
*/
parser.prototype.readBlock = function( indent, spec )
{
	const numlines = this.lines.length;
	let bi = null;
	let block = [];
	const re_comm = parser.regex.justcomment;
	const re_bl = parser.regex.blockline;
	const level = this.def.level < 0 ? 0 : this.def.level;

	spec = parser.regex.blockspec2.exec( spec );


	if (spec[2]) {
		bi = indent + spec[2] * 1;
	}

	for (++this.line; this.line < numlines; ++this.line) {
		const l = DEET.expandTabs( this.lines[this.line], this.def.tabs );
		let got = re_bl.exec( l );
		let in2 = got[1] ? got[1].length : 0;
		if (in2 <= level) {
			if (re_comm.test( got[2] )) {
				continue;
			} else if (got[2]) {
				--this.line;
				break;
			}
			block.push( "" );
		} else if (bi === null) {
			bi = got[1].length;
			block.push( got[2] );
		} else if (in2 < bi) {
			this.error = "invalid indent";
			return;
		} else {
			if (in2 > bi) {
				block.push( l.substr( bi ) );
			} else {
				block.push( got[2] );
			}
		}
	}
	--this.line;
	if (spec[1] == ">") {
		// fold
		let b2 = [];
		let para = [];
		for (let i = 0, ic = block.length; i < ic; i++) {
			const l = block[i];
			if (!l.length || l[0] == ' ') {
				if (para.length) {
					b2.push( para.join( " " ) );
					para = [];
					if (!l.length) {
						continue;
					}
				}
				b2.push( l );
			} else {
				para.push( l.trim() );
			}
		}
		if (para.length) {
			b2.push( para.join( " " ) );
		}
		block = b2;
	}
	var chomp = spec[3] || "";
	if (chomp == "+") {
		block.push("");
	} else if (chomp == "-" || chomp == "") {
		let scan;
		for (scan = block.length - 1; scan >= 0; --scan) {
			if (block[ scan ] != "") {
				break;
			}
		}
		block = block.slice( 0, scan + 1 );
		if (chomp == "") {
			block.push( "" );
		}
	} else if (chomp == "j" || chomp == "json") {
		try {
			let v = JSON.parse( block.join("") );
			return v;
		} catch (e) {
			this.error = "cannot parse JSON";
			return;
		}
	} else if (chomp == "x" || chomp == "hex") {
		return DEET.parseHexBlock( block );
	} else if (chomp == "b" || chomp == "base64" || chomp == "base-64" ) {
		return DEET.parseBase64Block( block );
	} else {
		// TODO: binary
	}
	block = block.join( "\n" );
	return block;
}

/*
=====================
parse
=====================
*/
_static.parse = function( text, options )
{
	var p = new DEET.parser( text, options );
	p.run();
	var err = p.getError();
	if (err) {
		if (!options || !options.noThrow) {
			throw new DEET.ParseError( err );
		}
		console.error( err );
		return null;
	}
	return p.getResult();
}


/*
=====================
stringify
=====================
*/ /*
_static.stringify = function( text, options )
{
	throw new ReferenceError( "DEET.stringify is not implemented" );
}
*/

})();	// end DEET
