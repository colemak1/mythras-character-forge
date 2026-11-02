# Campaign and character links

- Keep the requested page when the app restores a signed-in session, instead of allowing an early menu render to replace the link.
- Check: sign in, open a campaign or saved character, and refresh. The same page should reopen. Also check a signed-out private link and a campaign invitation.
- Automated route tests simulate the authentication race; production browser confirmation remains necessary.
