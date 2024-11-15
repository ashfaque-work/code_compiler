import React from "react";
import { Link } from "react-router-dom";

const assessments = [
  {
    id: 1,
    title: "Two Sum",
    description: "Return indices of two numbers that add up to the target.",
  },
  {
    id: 2,
    title: "Palindrome Number",
    description: "Determine whether an integer is a palindrome.",
  },
  {
    id: 3,
    title: "Reverse Integer",
    description: "Reverse the digits of an integer.",
  },
  {
    id: 4,
    title: "Roman to Integer",
    description: "Convert a Roman numeral to an integer.",
  },
  {
    id: 5,
    title: "Longest Increasing Subarray",
    description: "Find the length of the longest increasing subarray.",
  },
  {
    id: 6,
    title: "Search Insert Position",
    description: "Find the index to insert the target value in a sorted array.",
  },
];

function AssessmentList() {
  return (
    <div className="AssessmentList">
      <header className="header">Coding Assessments</header>
      <div className="AssessmentContainer">
        <h3 className="heading">Select a Coding Problem:</h3>
        <div className="container">
          <ul className="assessment-list">
            {assessments.map((assessment) => (
              <li className="assessment-item" key={assessment.id}>
                <Link
                  className="assessment-link"
                  to={`/assessment/${assessment.id}`}
                >
                  <div className="assessment-card">
                    <h4>{assessment.title}</h4>
                    <p>{assessment.description}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default AssessmentList;
