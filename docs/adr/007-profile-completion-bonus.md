# 007. Profile Completion Bonus Logic

Date: 2026-02-14

## Context
To encourage users to complete their profiles, we are introducing a 200pt bonus.
The validation logic involves checking multiple fields (name, gender, birthday, location, interests, and student attributes if applicable).
We need to ensure users cannot manipulate this bonus (e.g., getting it multiple times or bypassing validation).

## Decision
We implemented the profile update and bonus awarding logic within a unified Server Action (`updateProfile`).

1. **Server-Side Validation**: The `checkProfileCompletion` function runs on the server, verifying all required fields are present in the database (or the incoming payload).
2. **Atomic Transaction**: The update of profile data and the awarding of points (and setting the `is_profile_completed` flag) happen within the same logical flow (though Supabase doesn't support multi-table transactions easily without RPC, we use sequential await with error handling).
3. **Idempotency**: The `is_profile_completed` flag in the `profiles` table ensures the bonus is awarded only once.
4. **Client Feedback**: The Server Action returns a `bonusAwarded` boolean to trigger client-side animations, decoupling the UI from the business logic.

## Consequences
- **Security**: Points are secure from client-side tampering.
- **Consistency**: The definition of "Complete" is centralized in `lib/actions/profile.ts`.
- **UX**: The UI can immediately react to the bonus award without polling, thanks to the return value.
