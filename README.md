# Job Portal Website

A clean job-portal landing page with an application form and a Node backend that stores submissions in `data/applications.json`.

## Run

```bash
npm start
```

The server listens on `http://localhost:3001` by default.

## Backend

- `GET /api/jobs` returns the open roles shown on the page.
- `GET /api/applications` returns stored applications.
- `POST /api/applications` accepts a JSON application payload from the form.

## Form Fields

- Full name
- Email
- Phone
- Role
- Location
- Work mode
- Years of experience
- Portfolio / LinkedIn
- Resume URL
- Cover letter
- Availability
