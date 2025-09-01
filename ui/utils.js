export function toast(msg){
  const t = document.getElementById("toaster");
  if(!t) return;
  t.textContent = msg;
  t.classList.remove("hidden");
  setTimeout(()=>t.classList.add("hidden"), 1500);
}
