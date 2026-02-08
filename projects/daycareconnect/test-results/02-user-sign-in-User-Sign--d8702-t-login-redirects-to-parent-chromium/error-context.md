# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - link "DayCareConnect" [ref=e5] [cursor=pointer]:
      - /url: /
    - generic [ref=e6]:
      - generic [ref=e7]:
        - generic [ref=e8]: Sign In
        - generic [ref=e9]: Enter your email and password to access your account.
      - generic [ref=e10]:
        - generic [ref=e11]:
          - generic [ref=e12]:
            - generic [ref=e13]: Email
            - textbox "Email" [ref=e14]:
              - /placeholder: you@example.com
          - generic [ref=e15]:
            - generic [ref=e16]: Password
            - textbox "Password" [ref=e17]
        - generic [ref=e18]:
          - button "Sign In" [ref=e19]
          - generic [ref=e20]:
            - link "Forgot password?" [ref=e21] [cursor=pointer]:
              - /url: /forgot-password
            - link "Create account" [ref=e22] [cursor=pointer]:
              - /url: /register
  - button "Dev Login" [ref=e24]
```