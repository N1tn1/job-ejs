const puppeteer = require("puppeteer");
require("../app");
const { seed_db, testUserPassword } = require("../utils/seed_db");
const Job = require("../models/Job");

let testUser = null;
let page = null;
let browser = null;

// Launch the browser and open a new blank page
describe("jobs-ejs puppeteer test", function () {
  before(async function () {
    this.timeout(10000);
    browser = await puppeteer.launch();
    page = await browser.newPage();
    await page.goto("http://localhost:3000");
  });

  after(async function () {
    this.timeout(5000);
    await browser.close();
  });

  describe("got to site", function () {
    it("should have completed a connection", async function () {});
  });

  describe("index page test", function () {
    this.timeout(10000);
    it("finds the index page logon link", async () => {
      this.logonLink = await page.waitForSelector("a ::-p-text(Click this link to logon)");
    });

    it("gets to the logon page", async () => {
      await this.logonLink.click();
      await page.waitForNavigation();
      const email = await page.waitForSelector('input[name="email"]');
    });
  });

  describe("logon page test", function () {
    this.timeout(20000);
    it("resolves all the fields", async () => {
      this.email = await page.waitForSelector('input[name="email"]');
      this.password = await page.waitForSelector('input[name="password"]');
      this.submit = await page.waitForSelector("button ::-p-text(Logon)");
    });

    it("sends the logon", async () => {
      testUser = await seed_db();
      await this.email.type(testUser.email);
      await this.password.type(testUserPassword);
      await this.submit.click();
      await page.waitForNavigation();
      await page.waitForSelector(`p ::-p-text(${testUser.name} is logged on.)`);
      await page.waitForSelector("a ::-p-text(change the secret)");
      await page.waitForSelector('a[href="/secretWord"]');
      const copyr = await page.waitForSelector("p ::-p-text(copyright)");
      const copyrText = await copyr.evaluate((el) => el.textContent);
      console.log("copyright text: ", copyrText);
    });
  });


  describe("puppeteer job operations", function () {
    it("should display the jobs list with 20 entries", async () => {
      const { expect } = await import('chai');
      await page.click("a[href='/jobs']");
      await page.waitForNavigation();

      const content = await page.content();
      const rows = content.split("<tr>").length - 1; 
      expect(rows).to.equal(20);
    });

    it("should show the add job form", async () => {
      const { expect } = await import('chai');
      await page.click("button#addJob"); 
      await page.waitForSelector("form#addJobForm"); 

      const formVisible = await page.$eval("form#addJobForm", (form) => form !== null);
      expect(formVisible).to.be.true;

      const companyField = await page.$("#company"); 
      const positionField = await page.$("#position"); 
      const addButton = await page.$("button[type='submit']"); 

      expect(companyField).to.not.be.null;
      expect(positionField).to.not.be.null;
      expect(addButton).to.not.be.null;
    });

    it("should add a job and verify the listing", async () => {
      const { expect } = await import('chai');
      const companyName = "Test Company";
      const positionName = "Test Position";

      await page.type("#company", companyName);
      await page.type("#position", positionName);
      await page.click("button[type='submit']"); 

      await page.waitForNavigation();

      const message = await page.$eval(".notification", (el) => el.innerText); 
      expect(message).to.include("Job listing has been added");

      const addedJob = await Job.findOne({ company: companyName, position: positionName });
      expect(addedJob).to.not.be.null;
    });
  });
});
