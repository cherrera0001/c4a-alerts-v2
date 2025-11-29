import { Suspense } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import LoadingSpinner from "./LoadingSpinner";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar />
        <main className="flex-1 p-6">
          <Suspense fallback={<LoadingSpinner />}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}




