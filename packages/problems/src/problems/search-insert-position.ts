import type { Problem } from "../types.js";

export const searchInsertPosition: Problem = {
  slug: "search-insert-position",
  title: "Search Insert Position",
  difficulty: "easy",
  summary: "Locate a value in a sorted list, or say where it belongs.",
  statement:
    "Given a sorted list of distinct integers and a target value, print the " +
    "position of the target. If it is not present, print the position where " +
    "it would be inserted to keep the list sorted. Aim for O(log n).",
  inputContract:
    "Line 1: the sorted integers, separated by spaces.\n" +
    "Line 2: the target integer.",
  outputContract: "One integer: the position, counting from 0.",
  examples: [
    { input: "1 3 5 6\n5", expectedOutput: "2" },
    { input: "1 3 5 6\n2", expectedOutput: "1" },
    { input: "1 3 5 6\n7", expectedOutput: "4" },
  ],
  hiddenTests: [
    { input: "1 3 5 6\n0", expectedOutput: "0" },
    { input: "1\n0", expectedOutput: "0" },
    { input: "1\n2", expectedOutput: "1" },
    { input: "-5 -2 0 3 8 12\n-2", expectedOutput: "1" },
    { input: "2 4 6 8 10 12 14\n13", expectedOutput: "6" },
  ],
  starterCode: {
    python: `import sys


def solve(nums, target):
    # Return the index of target, or where it would be inserted
    return 0


lines = sys.stdin.read().split("\\n")
nums = [int(x) for x in lines[0].split()]
target = int(lines[1])
print(solve(nums, target))
`,
    javascript: `function solve(nums, target) {
  // Return the index of target, or where it would be inserted
  return 0;
}

const lines = require("fs").readFileSync(0, "utf8").split("\\n");
const nums = lines[0].trim().split(/\\s+/).map(Number);
const target = Number(lines[1]);
console.log(solve(nums, target));
`,
    typescript: `function solve(nums: number[], target: number): number {
  // Return the index of target, or where it would be inserted
  return 0;
}

const lines: string[] = require("fs").readFileSync(0, "utf8").split("\\n");
const nums: number[] = lines[0].trim().split(/\\s+/).map(Number);
const target: number = Number(lines[1]);
console.log(solve(nums, target));
`,
    cpp: `#include <iostream>
#include <sstream>
#include <string>
#include <vector>

int solve(const std::vector<int>& nums, int target) {
    // Return the index of target, or where it would be inserted
    return 0;
}

int main() {
    std::string line;
    std::getline(std::cin, line);
    std::istringstream stream(line);

    std::vector<int> nums;
    int value;
    while (stream >> value) nums.push_back(value);

    int target;
    std::cin >> target;

    std::cout << solve(nums, target) << std::endl;
    return 0;
}
`,
    java: `import java.util.*;

public class Main {
    static int solve(int[] nums, int target) {
        // Return the index of target, or where it would be inserted
        return 0;
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        String[] parts = scanner.nextLine().trim().split("\\\\s+");

        int[] nums = new int[parts.length];
        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);

        int target = Integer.parseInt(scanner.nextLine().trim());
        System.out.println(solve(nums, target));
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

func solve(nums []int, target int) int {
	// Return the index of target, or where it would be inserted
	return 0
}

func main() {
	reader := bufio.NewReader(os.Stdin)

	first, _ := reader.ReadString('\\n')
	var nums []int
	for _, field := range strings.Fields(first) {
		value, _ := strconv.Atoi(field)
		nums = append(nums, value)
	}

	second, _ := reader.ReadString('\\n')
	target, _ := strconv.Atoi(strings.TrimSpace(second))

	fmt.Println(solve(nums, target))
}
`,
    rust: `use std::io::{self, Read};

fn solve(nums: &[i64], target: i64) -> usize {
    // Return the index of target, or where it would be inserted
    0
}

fn main() {
    let mut input = String::new();
    io::stdin().read_to_string(&mut input).unwrap();

    let mut lines = input.lines();
    let nums: Vec<i64> = lines
        .next()
        .unwrap_or("")
        .split_whitespace()
        .filter_map(|token| token.parse().ok())
        .collect();
    let target: i64 = lines.next().unwrap_or("0").trim().parse().unwrap_or(0);

    println!("{}", solve(&nums, target));
}
`,
  },
};
