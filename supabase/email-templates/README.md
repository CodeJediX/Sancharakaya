# Sancharakaya Supabase Email Templates

Use `confirm-signup.html` for the Supabase Auth **Confirm sign up** email template.

Recommended subject:

```text
Confirm your Sancharakaya account
```

Dashboard path:

```text
Supabase Dashboard -> Authentication -> Email Templates -> Confirm sign up
```

To make the sender show as Sancharakaya, configure custom SMTP:

```text
Supabase Dashboard -> Authentication -> Emails -> SMTP Settings
Sender name: Sancharakaya
Sender email: no-reply@your-domain.com
```

The sender email must belong to a domain verified with your SMTP provider.
