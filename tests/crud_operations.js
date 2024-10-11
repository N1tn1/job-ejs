const Job = require("../models/Job");
require("../app");
const { seed_db, testUserPassword } = require("../utils/seed_db");
const get_chai = require("../utils/get_chai");

let test_user;
let csrfToken, csrfCookie, sessionCookie;

before(async function () {
    const { expect, request } = await get_chai(); // Move this inside the before hook
    this.expect = expect; // Save expect to this for use in tests
    this.request = request; // Save request to this for use in tests

    test_user = await seed_db();

    // Log in the user
    let req = this.request.execute(app).get("/session/logon").send();
    let res = await req;

    const textNoLineEnd = res.text.replaceAll("\n", "");
    csrfToken = /_csrf\" value=\"(.*?)\"/.exec(textNoLineEnd)[1];

    let cookies = res.headers["set-cookie"];
    csrfCookie = cookies.find((element) => element.startsWith("csrfToken"));

    const dataToPost = {
        email: test_user.email,
        password: testUserPassword,
        _csrf: csrfToken,
    };

    req = this.request
        .execute(app)
        .post("/session/logon")
        .set("Cookie", csrfCookie)
        .set("content-type", "application/x-www-form-urlencoded")
        .redirects(0)
        .send(dataToPost);

    res = await req;
    cookies = res.headers["set-cookie"];
    sessionCookie = cookies.find((element) => element.startsWith("connect.sid"));

    this.expect(csrfToken).to.not.be.undefined;
    this.expect(sessionCookie).to.not.be.undefined;
    this.expect(csrfCookie).to.not.be.undefined;
});

describe("Job operations tests", function () {
    it("should display the jobs list with 21 entries", async () => {
        const { expect, request } = this; // Use saved expect and request

        let req = request.execute(app)
            .get("/jobs") // Adjust to the correct endpoint for job listings
            .set("Cookie", csrfCookie + ";" + sessionCookie)
            .send();

        const res = await req;
        const pageParts = res.text.split("<tr>");
        expect(pageParts.length).to.equal(21); // Adjust this if necessary

        const jobs = await Job.find({ createdBy: test_user._id });
        expect(jobs.length).to.equal(21);
    });
});