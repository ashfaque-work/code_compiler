import { Link } from "react-router";
import { Shell } from "../components/Shell.js";

export function NotFound() {
  return (
    <Shell>
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <p className="text-ink">There is nothing at this address</p>
        <Link to="/" className="mt-3 text-sm text-action hover:underline">
          Back to the playground
        </Link>
      </div>
    </Shell>
  );
}
