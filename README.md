# DEET

*Format version: way early*

*Note to visitors: This is still heavily under construction. The parser works
and the docs are mostly correct, but some parts are incomplete and the spec is
still mixed with design commentary.*

DEET borrows heavily from YAML and somewhat from INI files and markdown. It is 
readable, usually obvious in its meaning and easy to parse.

The result of parsing a DEET file is usually a simple data structure that can be
directly represented in JSON and many other formats. There are six basic types
of data that can be represented:

  * Null
  * Boolean
  * Number
  * String (text or binary)
  * Array
  * Map
  * ...and metadata, if desired

This is the Javascript parser. It's reasonably fast but is architected for 
clarity at the expense of maximum speed. Javascript compatiblity includes IE11 
and most any recent browser.

## Using the Parser

Include "deet.js" in your page, and then:
	
	var got = DEET.parse( some_text );

The result will be the decoded contents of `some_text`.

## Format Overview

DEET (.dt) files look much like YAML to begin with. The key differences are in 
top-level sections and the metadata representation. The details of string 
formatting are quite different as well. JSON is not automatically parsed 
within a DEET file. 

	=== text ===

	rewind: Go to game start
	scrub: Go to move #$move
	next-player: "Next Player: $player"
	winner: "Winner: $player"

	intro: >
		Welcome to tic-tac-toe! It's a 
		simple fun game.

		Players take turns placing a mark
		on the game board. The first player
		to get $size of their marks in a row
		wins!

	=== config ===

	board-size: 3
	player-1: ((glyph)) X
	player-2: ((glyph)) O

	leaderboard:
		- DPO
		- RAO
		- KGB
		- FXL
		- SDG

## Format Features

### Lines

DEET files are line-oriented. Some elements can only be placed as the first or
last item on a line, and the end-of-line sequence terminates most definitions.

Lines may be terminated by a line feed character (LF - ASCII 10) or by a 
sequence of a carriage return (CR - ASCII 13) immediately followed by a line 
feed. It does not matter which termination is used, and they may be freely 
intermixed in any given file.

### Indent

Indent - that is, the quantity of white space at the beginning of a line - is
significant. Structured data is organized based on relative indent levels.
Consider:

	large_item:
		size: 7
		color: black
	small_item:
		size: 2
		color: grey

This represents a map with two elements: `large_item` ad `small_item`. Each 
element has a `size` and a `color`. The organization of the elements is 
represented entirely by their spacing.

#### Tabs

The TAB character is allowed in DEET files, and may be used to represent 
whitespace. Parsers are required to expand tabs into a variable number of 
spaces depending on the setting of the `deet-tabs` option and the TAB 
character's position in the line.

One exception (perhaps it would be better to say "complication") to this 
expansion rule is that within 

### Null

The word `null` corresponds to your implementation-appropriate null value.

### Booleans

The words `true` and `false` will generate appropriate boolean values.

### Numbers

Numbers generally follow the JSON convention, with additional syntax for
various other bases. Examples:

	integers:
	 base-10: 
	  - 12345
	  - -54321
	  - +7
	  - 0t12345
	 base-16:
	  - 0x1234Abcd
	  - -0xA5
	 base-8:
	  - 0l777
	  - 0l12345
	 base-2:
	  - 0y11010111
	  - -0y0000101

    floating-point:
     - 123.45
     - -0.5
     - 10e50
     - 1.455e-50

    strings-not-numbers:
     - .7					# The string ".7"
     - -.5					# The string "-.5"
     - +Infinity			# The string "+Infinity"
     - NaN					# The string "NaN"

Numbers are constrained in length or precision by the implementation, not by 
the format. There is no natural break at 32 or 64 bits as far as DEET is 
concerned. Numbers that exceed the available range or precision will be
parsed as strings.


### Strings

String handling is substantially different from most C-derived languages. The
default string format does not use backslash escapes, nor does it use 
dollar-sign tokens. The only token format it supports is curly braces, and 
there are a selection of pre-defined tokens. In addition, there is a syntax
for specifying characters by ordinal (or, if you prefer, code point).

	example strings:
		- "So I said, ""What's up, dude?"""
		- "The fat cat bats the rat's hat{cr}{lf}"
		- "NBSP: {#2010}, apostrophe: {#0t39}"

	Built-in tokens:
		- nul:  0x00
		- tab:  0x09
		- lf:   0x0a
		- cr:   0x0d
		- crlf: 0x0d,0x0a
		- obr:  {
		- cbr:  }
		- bs:   \
		- amp:  &
		- lt:   <
		- gt:   >
		- quot: "

The parser should offer a mechanism for extending the list of built-in tokens.
You can also declare additional token mappings in the file itself, see 
[Options].

C-style strings are supported with a prefix syntax:

	- c"The fat cat bats the rat's hat\r\n"
	- c"NBSP: \u2010, etc..."

Raw strings do not allow any kind of escaping, and cannot contain double-quotes
or line breaks:

    - r"So I said, 'What's up, dude?'"
    - r"A token looks like this: {lf}"		// Not a line feed
    - r"mantis attack!!!  {\_OO_/}" 

There are also binary strings, see the Binary Data feature for more info.



### Sections

Borrowed from INI files with a dash of markdown, sections look like this:

    ==== primary ====

    mainstuff: abcd
    morestuff: efgh

    some other thing: 500

    ==== section 2 ====

    mainstuff: totally different
    morestuff: ijkl

    ==== primary ====

    forgot this: 2.7

A section is marked by three or more '=' characters, followed by at least one
character of whitespace, followed by the section name. The section name may 
optionally be followed by whitespace, which may optionally be followed by
three or more '=' characters.

Here is the utterly awesome thing that sections enable: named sections without
extra levels of indent. They also let you spread the data for a section across
the file. The output (shown here re-encoded in JSON) just looks like a regular 
map at the top level:

	{
		"primary": {
			"mainstuff" : "abcd",
			"morestuff" : "efgh",
			"some other thing" : 500,
			"forgot this" : 2.7
		},
		"section 2": {
			"mainstuff" : "totally different",
			"morestuff" : "ijkl"
		}
	}

### Comments

Comments can be placed in the file as entire lines or
at the end of most lines, following a key or value.

The default comment sequence is "# " (a hash mark followed by a space). This 
sequence may appear at the beginning of any line, or following a value or 
key so long as there is intervening whitespace. This allows the hash mark to
appear in values without (too much) ambiguity, as in these examples:

	- #223344    						# An HTML color
	- hashtag #awesome!!!   			# this part is a comment
	- "# this is definitely a string"   # and here's a comment
	- Then there are some ambiguous cases:
	- # this is a comment (but it might be confusing)
	- #this is not a comment, but looks like it might be

Comments are allowed within text blocks, but only if the comment is at or 
below the indent level of the block's container. Examples:

	some-stuff: 
		string 1: >
			Here's a text block. It has
			multiple lines.

		# This is a comment about this text block. It will be discarded.
			It also has multiple paragraphs.

		string 2: |
			Here's another text block. It
			also has multiple lines. But there's
			a bug coming up.

		   # This is ambiguous and will cause a syntax error
			It also has multiple paragraphs.

		string 3: |
			Here's yet another text block. It
	# Comment coming through here...
			has multiple lines and doesn't fold paragraphs.

			# This is not a comment at all, it's 
			# part of the block

Generally, you should find that this allows you to create files that look good
and decode the way you would expect.

For visual formatting purposes, a comment that is the first item on a line 
AND is at or below the container indent may include some characters immediately 
following the hash mark:

	- Three or more '=' or '-' characters:

	#================
	# visible!
	#----------------

	- One or two '#' characters followed by a space, or three or more '#' \\
	  characters:

	#################
	## visible!
	#################
	####block
	#################

#### Why Overload '#'? 

Given the possible ambiguities, it is reasonable to ask why we should use the 
'#' character at all. C offers "//", and various other popular choices include
';' and "'". 

Comments are *important*. They should be easy to write, obvious to someone
encountering the format for the first time, and conventional enough that a 
coder dealing with 10 different formats a day doesn't reflexively create 
syntax errors or bad data.

The '#' character is by far the most common comment introducer in script and
configuration file formats, due to its use in popular early Unix shells. While
"//" would be familiar to any web coder (from Javscript, Node, PHP, C/C++ etc.),
it definitely looks more cluttered if you're not familiar with it. And it would
still require whitespce surrounds to take care of some ambiguous situations 
with pathnames and URLs.

On top of that, '#' does a really good job of visually partitioning the 
comments from the data. Consider the following:

	#----------
	# Stuff
	#----------
	- stuff 				# Info about the stuff
	- more stuff 			# Some commentary about stuff
	- some stuff 			# Yeah, this is stuff

	;----------
	; Stuff
	;----------
	- stuff 				; Info about the stuff
	- more stuff 			; Some commentary about stuff
	- some stuff 			; Yeah, this is stuff

	//----------
	// Stuff
	//----------
	- stuff 				// Info about the stuff
	- more stuff 			// Some commentary about stuff
	- some stuff 			// Yeah, this is stuff

Even with the same spacial arrangement, the '#' breaks the comments apart from
the data flow noticeably better.

Generally, use whitespace liberally and you should be fine. The ambiguous
cases should be pretty rare, and you can always quote a value or move a comment
to another line to make sure.


### Binary Data

Binary data can be represented as a string or a multi-line construct. The 
string format uses a "b" prefix and contains bytes encoded in base-64. The 
trailing padding is always optional:

	- b"SGVsbG8sIHdvcmxkIQ=="		// Hello, world!
	- b"SGVsbG8sIHdvcmxkIQ"			// also Hello, world!

You can also hex-encode data. Example hex-encoded binary string:

	- x"0102030405aabbccdd"

Note that unlike numbers, binary strings always decode beginning with the high
bits of the first byte. So, if the final byte in the string is not completely
specified (e.g. an odd number of digits in a hex-encoded string), the remainder
of the last byte will be set to 0. In the string `x"2"`, the result is one
byte long and the byte value is 0x20, or 32 decimal.

The multi-line format uses a flag on the "|" block format. These blocks should 
be formatted just like text, but their contents are converted to binary data. 
The following strings are identical after decoding:

	- <
		Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec 
		odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla 
		quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent 
		mauris.
	- |b
		TG9yZW0gaXBzdW0gZG9sb3Igc2l0IGFtZXQsIGNvbnNlY3RldHVyIGFkaXBpc2NpbmcgZW
		xpdC4gSW50ZWdlciBuZWMgb2Rpby4gUHJhZXNlbnQgbGliZXJvLiBTZWQgY3Vyc3VzIGFu
		dGUgZGFwaWJ1cyBkaWFtLiBTZWQgbmlzaS4gTnVsbGEgcXVpcyBzZW0gYXQgbmliaCBlbG
		VtZW50dW0gaW1wZXJkaWV0LiBEdWlzIHNhZ2l0dGlzIGlwc3VtLiBQcmFlc2VudCBtYXVy
		aXMu
	- |x
		4c6f72656d20697073756d20646f6c6f722073697420616d65742c20636f6e73656374
		657475722061646970697363696e6720656c69742e20496e7465676572206e6563206f
		64696f2e205072616573656e74206c696265726f2e205365642063757273757320616e
		74652064617069627573206469616d2e20536564206e6973692e204e756c6c61207175
		69732073656d206174206e69626820656c656d656e74756d20696d706572646965742e
		204475697320736167697474697320697073756d2e205072616573656e74206d617572
		69732e	

For your hacking convenience, binary is also supported:

	- |y
		00111100
		01000010
		10100101
		10000001
		10100101
		10011001
		01000010
		00111100

For even better skeuomorphic resonance, you can use synonyms for 0 and 1. 0 can 
also be represented by '.' or '-', and 1 by '*', '#' or 'X':

	- |y
		..****..  
		.*....*.
		*.X..X.*
		*......*
		*.X..X.*
		*..XX..*
		.*....*.
		..****..


The string and multi-line formats will ignore any whitespace within the data,
making it easier to break up the digits as desired. You can even include 
comments within these blocks using '#':

	- |x
		# paragraph of nonsense
		4c6f72656d20697073756d20646f6c6f7220736974
		20616d65742c20636f6e73656374657475722061646970697363696e6720656c69742e
		20496e7465676572206e6563206f64696f2e205072616573656e74206c696265726f2e
		20536564 20 							# hey here's a space 
		63757273757320616e7465206461706962
		7573206469616d2e20536564206e6973692e204e756c6c61207175
		69732073656d206174206e69626820656c656d656e74756d20696d706572646965742e
		204475697320736167697474697320697073756d2e205072616573656e74206d617572
		69732e	

Comments are discarded during decoding.

### Metadata

It is possible to include metadata with any value. This can be used to 
implement extended types or for any other purpose that requires extra 
information for a single value. Metadata is a usually handled as an 
identifier that is associated with the following value, though it is possible 
to specify extended values as well.

This is a highly implementation-dependent feature, usually supported with 
callbacks or lambda functions given to the parser.

Examples:

	==== main ====

	generated: ((date)) 08/02/2017

	((USD)): { currency: USD }

	fields:
		name: 			"John Smith"
		opened: 		((date)) 06/15/2015
		closed: 		((date)) 11/30/2016
		high_balance:   ((USD)) 1912.35
		overdraft_used: ((USD)) ((audit))  115.21
		code: 			((js)) function( acct ) { return mangle( acct ); }

Metadata tags are written as identifiers enclosed in double parentheses. The 
identifier may include most non-control characters except "(", ")" and 
" " (space). When metadata is encountered during parsing, the parser will 
invoke the implementation-defined mechanism to associate the metadata with the 
following value. If multiple metadata tags are present, they will be applied 
separately in turn to the value.

An implementation should provide a way for the caller to see the metadata tag,
the value following it (after regular parsing) and the container, if any. The
caller should have the opportunity to specify a substitute value. Once this
has been done, the metadata are discarded.

You may optionally define a value to associate with a metadata identifier. The
 definition looks like this:

	((tag)): value

A substitute definition may appear anywhere in the file and must be written at
the current container indent. It will apply only to uses of the tag that follow 
the definition, and will be discarded when parsing has finished for the 
container it was defined in.

	((stuff)) 				# simple metadata assertion. No associated value.

	thing:
		((stuff)): ponies
		- ((stuff)) "hi"   # associate "ponies" with "hi"
		((stuff)): false
		- ((stuff)) "hi"   # associate boolean false with "hi"

	thing2:
		- ((stuff)) "hi"	# associate "stuff" with "hi"
		- "((stuff))" "hi"  # the string '"((stuff))" "hi"'
	  ((stuff)): "oops"		# syntax error - wrong indent

### Options

Some parsing options can be defined directly in the file. This is a way for
authors to assert their intent in creating the file. Parsing options are
declared with [metadata]().

	# There are only a few options, shown here with their defaults:


	((deet-tabs)): 8					# width of each tab stop in spaces
	((deet-encoding)): UTF-8			# character encoding of the file
	((deet-numerics)): false			# Parse Infinity, NaN as floating point
	((deet-strict)): false				# Require all strings to be quoted

Options can be changed during parsing. Like other metadata, their declarations
only affect the lines following that declaration at the indent level they
occur at. This may be useful when a block of lines from a different source has
to be incorporated into a file.

#### deet-version

Someday, it may make a difference which format version a file is created for.
When that happens, this tag is ready.

#### deet-tabs

This value determines where tab stops are assumed to exist in the file. The
default tab width is 8. This can be set to any integer, though 1, 2, 4 and 8
are most common.

#### deet-encoding

Declares the character encoding used for the file. This may only be useful in
some implementations.

#### deet-numerics

If set to `true`, enables the parsing of some words as numeric values:

    numerics:
      - Infinity, -Infinity, +Infinity
      - Inf, +Inf, -Inf
	  - NaN, +NaN, -NaN

You can also define these values, if your platform and parser supports them, 
with metadata, via a `((deet-number))` tag or (if it hasn't been handled 
otherwise by the application) a `((number))` tag.


#### deet-strict

If set to `true`, disables all auto-typing of values. Values that are not 
null, boolean, numbers or explicit strings will generate syntax errors. This is
not suggested for files that humans will be interacting with.

Enabling `deet-strict` will also enable `deet-numerics`, under the assumption 
that the file is being used for data interchange.





