// Shows the administrator's contact email (set with CONTACT_EMAIL) on the Terms page.
const { contact } = await fetch('/api/public-info').then((r) => r.json()).catch(() => ({}));
if (contact) {
  const a = Object.assign(document.createElement('a'), { href: `mailto:${contact}`, textContent: contact });
  document.getElementById('contact').replaceChildren(a);
}
