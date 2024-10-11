const Job = require('../models/Job'); 
const parseValidationErrs = require('../utils/parseValidationErrs'); 
const csrf = require('csrf'); 
const csrfProtection = new csrf();

exports.getJobs = async (req, res) => {
    try {
        const jobs = await Job.find({ createdBy: req.user._id });
        const csrfToken = csrfProtection.create(req.session.id); 
        res.render("jobs", { jobs, csrfToken }); 
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
};

exports.addJob = async (req, res) => {
    try {
        const token = req.body._csrf;
        if (!csrfProtection.verify(req.session.id, token)) {
            return res.status(403).send('Invalid CSRF token');
        }

        const { company, position, status } = req.body;
        const job = new Job({ company, position, status, createdBy: req.user._id });
        await job.save();
        req.flash('success', 'Job added successfully');
        res.redirect('/jobs');
    } catch (error) {
        const errors = parseValidationErrs(error);
        res.render("job", { job: null, errors });
    }
};

exports.newJob = (req, res) => {
    const csrfToken = csrfProtection.create(req.session.id); 
    res.render("job", { job: null, errors: [], csrfToken }); 
};

exports.editJob = async (req, res) => {
    try {
        const job = await Job.findOne({ _id: req.params.id, createdBy: req.user._id });
        if (!job) {
            req.flash('error', 'Job not found or you do not have permission to edit it');
            return res.redirect('/jobs');
        }
        const csrfToken = csrfProtection.create(req.session.id); 
        res.render("job", { job, errors: [], csrfToken }); 
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
};

exports.updateJob = async (req, res) => {
    try {
        const token = req.body._csrf;
        if (!csrfProtection.verify(req.session.id, token)) {
            return res.status(403).send('Invalid CSRF token');
        }

        const { company, position, status } = req.body;
        const job = await Job.findOneAndUpdate(
            { _id: req.params.id, createdBy: req.user._id },
            { company, position, status },
            { new: true, runValidators: true }
        );
        if (!job) {
            req.flash('error', 'Job not found or you do not have permission to update it');
            return res.redirect('/jobs');
        }
        req.flash('success', 'Job updated successfully');
        res.redirect('/jobs');
    } catch (error) {
        const errors = parseValidationErrs(error);
        res.render("job", { errors, job: { company, position, status } });
    }
};

exports.deleteJob = async (req, res) => {
    try {
        await Job.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
        req.flash('success', 'Job deleted successfully');
        res.redirect('/jobs');
    } catch (error) {
        req.flash('error', 'Failed to delete job');
        res.redirect('/jobs');
    }
};