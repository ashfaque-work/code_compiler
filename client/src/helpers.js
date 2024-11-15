import { cpp } from '@codemirror/lang-cpp';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { java } from '@codemirror/lang-java'; 

export function getLanguageExtension(language) {
  switch (language) {
    case "cpp":
    case "c":
      return cpp();
    case "python":
      return python();
    case "java":
      return java();
    case "javascript":
      return javascript();
    default:
      return cpp(); // Default to C++
  }
}