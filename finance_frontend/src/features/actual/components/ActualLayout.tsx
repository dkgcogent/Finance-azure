import { Outlet } from "react-router-dom";
import { ActualNav } from "./ActualNav";

export default function ActualLayout() {
  return (
    <div className="space-y-6">
      <ActualNav />
      <Outlet />
    </div>
  );
}
