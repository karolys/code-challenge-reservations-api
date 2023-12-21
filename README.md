# code-challenge-reservations-api
Code challenge to create a basic reservation API between clients and providers

Requirements:
Construct a RESTful API with the following endpoints and functionality
- Allows Providers to submit times they are available for appointments
- Allows a client to retrieve a list of available appointment slots
  - Appointments must be made 24 hours in advance
- Allows clients to reserve an available appointment slot
  - Appointment slots are 15 minutes long
- Allows clients to confirm their reservation
  - Reservations must be confirmed within 30 minutes before they are made available to other clients

Proposed Solution:
NodeJS with Express into a MySQL DB

Reasoning:
Due to the nature of being a coding challenge as opposed to a more permanent and production capable system I decided to go the route I knew would
being quick to spin up and get things working. This lead to the choice of NodeJS/Express over SpringBoot/Java. I had considered a cloud based solution
using various AWS services but felt that would overcomplicate the task. 

Considerations during design:
- The 30 minute reservation expiry was a tricky bit, decided the intermediary Unconfirmed Appointments table was the go to for a more self-contained solution
- Given the 15 minute increment per appointment it could have been possible to allow for scheduling from say 2:34 to 2:49 however
in the interest of time I decided to restrict appointments to :00, :15, :30, :45. It seems to be a common default in various scheduling solutions 
and avoids complications likely of minimal benefit to users.
- Typescript may have been potentially beneficial in providing more structure and validation given this solution but would have increased implementation time

Possible future improvements:
- Error handling could be improved, along with validation, there are a few places I assumed where a production capable system should explicitly validate
- Logging to the cloud for monitoring would also be a beneficial extension for a production system
- The API should implement authentication for security and also account for potential vulnerabilities such as SQL Injection
- Availability list endpoint could/should be extended to support pagination and various filters (provider, date range)
- CRON job to clean out the unconfirmed appointments after 30 minutes, given current implementation, or add cleaning/garbage collection functionality when related API endpoints are hit
- Sending an email to the user to confirm their appointment and using an alphanumeric GUID to identify their Unconfirmed Appointment versus a sequential ID would be highly preferred
- More formal test cases/unit testing should be done for a production system
- Would refactor MySQL communication to be more uniform across the various calls
- Documentation containing input/output data structures expected, examples, parameters for endpoints and arguments for functions


