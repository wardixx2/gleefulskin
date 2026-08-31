export function adminRoute(section) {
  if (!section || section === "dashboard") {
    return "/admin";
  }

  return `/admin/${section}`;
}
