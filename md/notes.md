

the core game functionlaity is working perfectly. now, I want to revise the section of registration and leader board. need to remove the leaderboard section from the local version. the leaderboard part will not be visible to the users. will just be saved in the google sheet. 

the plan is to, the student will land in the game, register using the name, school and phone number first, the timer will start as he or she starts playing and after finishing the game, the users data will be saved in the sheet. every user can create one account, the unique value will be the phone number. the user can attempt the game only 5 times. we need to give a warning to the user in the homepage about this. the count will be monitored by the entry of that unique phone number in the sheet. if it has 5 entries in the sheet, then the user can't play anymore and can see the scores that is time he has taken by playing the game. in his own leaderboard. the data will be saved in the sheet after the game is finished and final time has been recorded. 



---

A Google Cloud service-account key for `study-abroad@gen-lang-client-0919425756`
used to sit here in plaintext. It was removed on 2026-08-11 while setting up
hosting, because this repo is now deployed as a static site and anything left in
the repo risks being served publicly.

That key must be treated as compromised: revoke it in Google Cloud Console >
IAM & Admin > Service Accounts > study-abroad@... > Keys > delete key id
`2c38c618fbd1d8f033905338020249bb39a2057c`.

Note that the game does not use this key at all — it talks to the Apps Script
Web App URL in public/js/puzzle-sheet.js, which authenticates as the deploying
Google account, not a service account. Nothing breaks by deleting it.
