Plan and develop a mobile-first library passport app.

A user can log check-ins to local library branches, see info about branches, etc.

I prompted v0 with a similar prompt and it created an extremely robust proof-of-concept. The repo is located here: `~/Documents/repos/v0-library-passport-app`

My thoughts on that implementation:

The Good:
Functionality and appearance wise, it feels like it's about 95% of the way there, especially for an MVP.
It's hosted and can be demonstrated easily.
A user can check into a branch > 1, and record a note about the experience each time
A considered dashboard shows the user their progress towards completing the passport, and a record of their recent visits
The explore tab has brief information about all branches, has a quick way to identify if a branch has been visited, and can be easily searched to find a specific branch
The branch pages feel informative without being too cluttered
Tags identify specific services offered at individual branches
Passport tab offers an easy reference to track progress and encourages the user to collect more stamps
History tab records all check-ins for a user to reference easily

The Bad:
There was no follow up input to my initial prompt and the LLM made every decision without consult, including: frameworks, libraries, design, user experience, database, authentication, check-in method.

General guidance of what I would like:
A step-by-step plan that can be followed, implemented, tested, reviewed, and iterated upon
Implementation of that plan
Regular git commits and git tree workflows and pushes to github.
Simplified implementation - open to how this is executed, but overall it feels like there are too many files, too many libraries, too much complexity. As a junior- to mid-level developer, I should be able to understand everything that's happening, know intuitively where to go in the codebase to refactor or modify any component, and maintain this without the necessity of an LLM at all times.
To that end, custom Tailwind written in each component and element may not be right for the project at this time, as I find it distracting when trying to read through code and understand its functionality. Simple is the key.
I do not need a true authentication solution at this time. I just need to be able to easily demonstrate the UX flow of a fresh, empty passport, a passport mid-progress, and a completed passport.
I expect this app will predominantly be used by parents and children working together to complete a passport, and alternatively, a Teen, who may be more independent but may link with other Teen users. There may be different experiences for a parent vs. a child vs. a teen. This should at the very least be considered if not implemented.
A user should have a settings page where they can declare their "home" branch, maybe have a picture or avatar, maybe have their favorite book, etc.
While manual check-ins are fine for an MVP, in practice I see the check-in being made by scanning a QR code and/or tapping the device to an NFC. Some hint towards either or both of those processes should be included in the MVP, even if they are non-functional. If they're functional, that's great too.
I'm open to suggestions but I think I would like to use Vue/Nuxt as the framework.
I'm open to database options, the v0 version is built on Supabase, and I have some experience with Firestore and Mongo. It doesn't have to be any of these but I'd look here first.
The finished product must be hosted somewhere for free. I'm open to options here.
The app should source actual data from the Toronto Public Library, and use color palettes and fonts associated with this library network. To that end, there is information in this file and files in the assets and data folders to assist with that.
I've included a static copy of the library branch information to get you started. Library branch information is updated annually so a fetch to the API may not be needed each time.
I could see incorporating the events feed for branches into the branch pages.
I could see checking into a given branch unlocks facts about that branch, maybe historical ones, maybe information about circulation, etc. that is included in the data I provided
I could also see each branch having a unique stamp - no need to go crazy designing these right now, but alluding to that concept would be nice
I could see the passport portion being paginated or otherwise organized by neighborhood or ward, as defined in the data provided.
I could see the branch pages maybe not including rows for every individual day's hours, especially if they are duplicative, but maybe just for today, as a quick reference (or could be expanded?)
I could see a "travel planning" feature, where you maybe want to plan a visit to 5 branches on a single day, and add it to your calendar, but that is perhaps a bit beyond the scope right now.
Overall it should feel fun and a bit whimsical. The passport stamps are bringing to mind balatro cards for me. Again, don't need to implement full design yet, but just as a guiding concept.

website: tpl.ca
Primary blue: #005fc0
Secondary blue: #001c71
Generic blue: #02729e

And with that, let's begin to plan and develop this mobile-first library app.
