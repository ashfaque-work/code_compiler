import type { Problem } from "../types.js";

export const reverseInteger: Problem = {
  slug: "reverse-integer",
  title: "Reverse Integer",
  difficulty: "easy",
  summary: "Reverse the digits of a signed integer.",
  statement:
    "Given a signed integer, reverse its digits and print the result. The " +
    "sign is preserved, and leading zeros in the reversed number are " +
    "dropped: 120 becomes 21. If the reversed value falls outside the signed " +
    "32-bit range, print 0.",
  inputContract: "A single line holding one integer.",
  outputContract: "The reversed integer on one line.",
  examples: [
    { input: "123", expectedOutput: "321" },
    { input: "-123", expectedOutput: "-321" },
    { input: "120", expectedOutput: "21" },
  ],
  hiddenTests: [
    { input: "0", expectedOutput: "0" },
    { input: "7", expectedOutput: "7" },
    { input: "-90", expectedOutput: "-9" },
    { input: "1534236469", expectedOutput: "0" },
    { input: "-2147483648", expectedOutput: "0" },
  ],
  starterCode: {
    python: `import sys


def solve(n):
    # Return the reversed integer, or 0 on 32-bit overflow
    return 0


print(solve(int(sys.stdin.read().strip())))
`,
    javascript: `function solve(n) {
  // Return the reversed integer, or 0 on 32-bit overflow
  return 0;
}

const n = Number(require("fs").readFileSync(0, "utf8").trim());
console.log(solve(n));
`,
    typescript: `function solve(n: number): number {
  // Return the reversed integer, or 0 on 32-bit overflow
  return 0;
}

const n: number = Number(require("fs").readFileSync(0, "utf8").trim());
console.log(solve(n));
`,
    cpp: `#include <iostream>

long long solve(long long n) {
    // Return the reversed integer, or 0 on 32-bit overflow
    return 0;
}

int main() {
    long long n;
    std::cin >> n;
    std::cout << solve(n) << std::endl;
    return 0;
}
`,
    java: `import java.util.*;

public class Main {
    static long solve(long n) {
        // Return the reversed integer, or 0 on 32-bit overflow
        return 0;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        long n = Long.parseLong(scanner.nextLine().trim());
        System.out.println(solve(n));
    }
}
`,
    go: `package main

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
)

func solve(n int64) int64 {
	// Return the reversed integer, or 0 on 32-bit overflow
	return 0
}

func main() {
	reader := bufio.NewReader(os.Stdin)
	line, _ := reader.ReadString('\\n')
	n, _ := strconv.ParseInt(strings.TrimSpace(line), 10, 64)
	fmt.Println(solve(n))
}
`,
    rust: `use std::io::{self, Read};

fn solve(n: i64) -> i64 {
    // Return the reversed integer, or 0 on 32-bit overflow
    0
}

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();
    let n: i64 = input.trim().parse().unwrap_or(0);
    println!("{}", solve(n));
}
`,
  },
};
