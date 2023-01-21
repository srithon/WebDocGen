/**
 * @param s - the input string in which to match.
 * @param startIndex - the index within the string corresponding to the opening curly brace.
 * @returns - the index after the closing brace corresponding to the starting
 * opening brace (number) OR undefined if there are not enough closing braces
 * in the rest of the string.
 */
function matchCurly(s: string, startIndex: number): number | undefined {
  let numOpenBraces = 0;
  let i = startIndex;

  while (i < s.length) {
    const c = s[i];
    if (c === "{") {
      numOpenBraces += 1;
    } else if (c === "}") {
      numOpenBraces -= 1;

      if (numOpenBraces === 0) {
        return i + 1;
      }
    }

    i += 1;
  }
}

/**
 * @param s - The input string, containing raw markdown text.
 * @returns - The input string, except with double curly braces replaced with
 * angle brackets, triple curlies replaced with double curlies, quadruple
 * replaced with triple, etc. Note that this function will throw an Error if
 * the curly braces are not properly matched.
 */
export function substituteDoubleCurliesForAngleBrackets(s: string): string {
  let res = "";

  let i = 0;
  while (i < s.length) {
    const c = s[i];

    if (c === "{") {
      if (s[i + 1] === "{") {
        const endIndex = matchCurly(s, i);

        if (!endIndex) {
          throw new Error("Curly braces are not matched!");
        }

        if (s[i + 2] === "{") {
          // then, take off one layer of curlies and continue
          res += s.substring(i + 1, endIndex - 1);
        } else {
          // then, that's an html tag
          // matchCurly and everything inside of it will be enclosed in angle brackets
          res += "<";
          res += s.substring(i + 2, endIndex - 2);
          res += ">";
        }

        i = endIndex;
        continue;
      }
    }

    res += c;
    i += 1;
  }

  return res;
}
