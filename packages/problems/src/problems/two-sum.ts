import type { Problem } from "../types.js";

export const twoSum: Problem = {
  slug: "two-sum",
  title: "Two Sum",
  difficulty: "easy",
  summary: "Find the two numbers that add up to a target.",
  statement:
    "Given a list of integers and a target value, find the two numbers that " +
    "add up to the target and report their positions. Exactly one pair will " +
    "match, and you may not reuse the same element twice.",
  inputContract:
    "Line 1: the integers, separated by spaces.\n" +
    "Line 2: the target integer.",
  outputContract:
    "The two positions, smallest first, separated by a space. Positions " +
    "count from 0.",
  examples: [
    { input: "2 7 11 15\n9", expectedOutput: "0 1" },
    { input: "3 2 4\n6", expectedOutput: "1 2" },
  ],
  hiddenTests: [
    { input: "3 3\n6", expectedOutput: "0 1" },
    { input: "-1 -2 -3 -4\n-7", expectedOutput: "2 3" },
    { input: "0 4 3 0\n0", expectedOutput: "0 3" },
    { input: "1 5 9 14 20\n34", expectedOutput: "3 4" },
  ],
  starterCode: {
    python: `import sys


def solve(nums, target):
    # Return the two positions as a list, e.g. [0, 1]
    return []


lines = sys.stdin.read().split("\\n")
nums = [int(x) for x in lines[0].split()]
target = int(lines[1])
print(" ".join(str(i) for i in solve(nums, target)))
`,
    javascript: `function solve(nums, target) {
  // Return the two positions as an array, e.g. [0, 1]
  return [];
}

const lines = require("fs").readFileSync(0, "utf8").split("\\n");
const nums = lines[0].trim().split(/\\s+/).map(Number);
const target = Number(lines[1]);
console.log(solve(nums, target).join(" "));
`,
    typescript: `function solve(nums: number[], target: number): number[] {
  // Return the two positions as an array, e.g. [0, 1]
  return [];
}

const lines: string[] = require("fs").readFileSync(0, "utf8").split("\\n");
const nums: number[] = lines[0].trim().split(/\\s+/).map(Number);
const target: number = Number(lines[1]);
console.log(solve(nums, target).join(" "));
`,
    cpp: `#include <iostream>
#include <sstream>
#include <string>
#include <vector>

std::vector<int> solve(const std::vector<int>& nums, int target) {
    // Return the two positions, e.g. {0, 1}
    return {};
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

    std::vector<int> answer = solve(nums, target);
    for (size_t i = 0; i < answer.size(); ++i) {
        if (i > 0) std::cout << " ";
        std::cout << answer[i];
    }
    std::cout << std::endl;
    return 0;
}
`,
    java: `import java.util.*;

public class Main {
    static int[] solve(int[] nums, int target) {
        // Return the two positions, e.g. {0, 1}
        return new int[] {};
    }

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        String[] parts = scanner.nextLine().trim().split("\\\\s+");

        int[] nums = new int[parts.length];
        for (int i = 0; i < parts.length; i++) nums[i] = Integer.parseInt(parts[i]);

        int target = Integer.parseInt(scanner.nextLine().trim());

        int[] answer = solve(nums, target);
        StringBuilder out = new StringBuilder();
        for (int i = 0; i < answer.length; i++) {
            if (i > 0) out.append(" ");
            out.append(answer[i]);
        }
        System.out.println(out.toString());
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

func solve(nums []int, target int) []int {
	// Return the two positions, e.g. []int{0, 1}
	return []int{}
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

	answer := solve(nums, target)
	parts := make([]string, len(answer))
	for i, value := range answer {
		parts[i] = strconv.Itoa(value)
	}
	fmt.Println(strings.Join(parts, " "))
}
`,
    rust: `use std::io::{self, Read};

fn solve(nums: &[i64], target: i64) -> Vec<usize> {
    // Return the two positions, e.g. vec![0, 1]
    Vec::new()
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

    let answer = solve(&nums, target);
    let parts: Vec<String> = answer.iter().map(|value| value.to_string()).collect();
    println!("{}", parts.join(" "));
}
`,
  },
};
