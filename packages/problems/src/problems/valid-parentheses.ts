import type { Problem } from "../types.js";

export const validParentheses: Problem = {
  slug: "valid-parentheses",
  title: "Valid Parentheses",
  difficulty: "easy",
  summary: "Decide whether every bracket is closed in the right order.",
  statement:
    "Given a string made only of the characters ( ) [ ] { }, decide whether " +
    "it is balanced: every opening bracket is closed by the same kind of " +
    "bracket, and brackets close in the reverse of the order they opened.",
  inputContract:
    "Line 1: the bracket string, with no spaces. It is never empty.",
  outputContract: "true if the string is balanced, otherwise false.",
  examples: [
    { input: "()", expectedOutput: "true" },
    { input: "()[]{}", expectedOutput: "true" },
    { input: "(]", expectedOutput: "false" },
  ],
  hiddenTests: [
    { input: "([{}])", expectedOutput: "true" },
    // Right counts, wrong nesting: a counter-only solution passes this.
    { input: "([)]", expectedOutput: "false" },
    // Closes before anything opened: an unguarded pop fails here.
    { input: "]", expectedOutput: "false" },
    // Left open at the end: a solution that never checks the stack is empty.
    { input: "((", expectedOutput: "false" },
    { input: "{[]}(){[()]}", expectedOutput: "true" },
    { input: "(((((((((())))))))))", expectedOutput: "true" },
  ],
  starterCode: {
    python: `import sys


def solve(s):
    # Return True if every bracket is closed in the right order
    return False


s = sys.stdin.read().strip()
print("true" if solve(s) else "false")
`,
    javascript: `function solve(s) {
  // Return true if every bracket is closed in the right order
  return false;
}

const s = require("fs").readFileSync(0, "utf8").trim();
console.log(solve(s) ? "true" : "false");
`,
    typescript: `function solve(s: string): boolean {
  // Return true if every bracket is closed in the right order
  return false;
}

const s: string = require("fs").readFileSync(0, "utf8").trim();
console.log(solve(s) ? "true" : "false");
`,
    cpp: `#include <iostream>
#include <string>

bool solve(const std::string& s) {
    // Return true if every bracket is closed in the right order
    return false;
}

int main() {
    std::string s;
    std::getline(std::cin, s);
    std::cout << (solve(s) ? "true" : "false") << std::endl;
    return 0;
}
`,
    java: `import java.util.*;

public class Main {
    static boolean solve(String s) {
        // Return true if every bracket is closed in the right order
        return false;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        String s = scanner.hasNextLine() ? scanner.nextLine().trim() : "";
        System.out.println(solve(s) ? "true" : "false");
    }
}
`,
    go: `package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"
)

func solve(s string) bool {
	// Return true if every bracket is closed in the right order
	return false
}

func main() {
	reader := bufio.NewReader(os.Stdin)
	line, _ := reader.ReadString('\\n')
	fmt.Println(solve(strings.TrimSpace(line)))
}
`,
    rust: `use std::io::{self, Read};

fn solve(s: &str) -> bool {
    // Return true if every bracket is closed in the right order
    false
}

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    println!("{}", solve(input.trim()));
}
`,
  },
};
