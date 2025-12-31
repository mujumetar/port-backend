const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

/* -------------------- MongoDB -------------------- */
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch(console.error);

/* -------------------- Cloudinary -------------------- */
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* -------------------- Multer (Memory) -------------------- */
const upload = multer({ storage: multer.memoryStorage() });

const uploadToCloudinary = (fileBuffer, folder) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        streamifier.createReadStream(fileBuffer).pipe(stream);
    });
};

/* -------------------- Models -------------------- */
const Profile = mongoose.model(
    "Profile",
    new mongoose.Schema({
        name: String,
        title: String,
        bio: String,
        photo: String,
    })
);

const Project = mongoose.model(
    "Project",
    new mongoose.Schema(
        {
            title: String,
            description: String,
            tech: [String],
            image: String,
            github: String,
            live: String,
        },
        { timestamps: true }
    )
);

const Experience = mongoose.model(
    "Experience",
    new mongoose.Schema(
        {
            company: String,
            role: String,
            startDate: String,
            endDate: String,
            description: String,
        },
        { timestamps: true }
    )
);

const Certification = mongoose.model(
    "Certification",
    new mongoose.Schema({
        name: String,
        issuer: String,
        year: String,
        image: String, // ✅ certificate image
    }, { timestamps: true })
);


const Contact = mongoose.model(
    "Contact",
    new mongoose.Schema({
        name: String,
        email: String,
        phone: String, // ✅ added
        message: String,
        createdAt: { type: Date, default: Date.now },
    })
);


const Testimonial = mongoose.model(
    "Testimonial",
    new mongoose.Schema(
        {
            name: String,
            role: String,
            company: String,
            message: String,
            rating: Number,
        },
        { timestamps: true }
    )
);

/* -------------------- PROFILE APIs -------------------- */
// Create / Update Profile + Photo
app.post("/api/profile", upload.single("photo"), async (req, res) => {
    try {
        let imageUrl;

        if (req.file) {
            const uploadRes = await uploadToCloudinary(
                req.file.buffer,
                "portfolio/profile"
            );
            imageUrl = uploadRes.secure_url;
        }

        const profile = await Profile.findOne();

        const data = {
            ...req.body,
            ...(imageUrl && { photo: imageUrl }),
        };

        const result = profile
            ? await Profile.findByIdAndUpdate(profile._id, data, { new: true })
            : await Profile.create(data);

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Profile
app.get("/api/profile", async (req, res) => {
    res.json(await Profile.findOne());
});

/* -------------------- PROJECT APIs -------------------- */
// Add Project
app.post("/api/projects", upload.single("image"), async (req, res) => {
    try {
        let imageUrl;

        if (req.file) {
            const uploadRes = await uploadToCloudinary(
                req.file.buffer,
                "portfolio/projects"
            );
            imageUrl = uploadRes.secure_url;
        }

        const project = await Project.create({
            ...req.body,
            tech: req.body.tech?.split(","),
            image: imageUrl,
        });

        res.json(project);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Projects
app.get("/api/projects", async (req, res) => {
    res.json(await Project.find());
});

// Update Project
app.put("/api/projects/:id", upload.single("image"), async (req, res) => {
    try {
        let imageUrl;

        if (req.file) {
            const uploadRes = await uploadToCloudinary(
                req.file.buffer,
                "portfolio/projects"
            );
            imageUrl = uploadRes.secure_url;
        }

        const updated = await Project.findByIdAndUpdate(
            req.params.id,
            {
                ...req.body,
                tech: req.body.tech?.split(","),
                ...(imageUrl && { image: imageUrl }),
            },
            { new: true }
        );

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete Project
app.delete("/api/projects/:id", async (req, res) => {
    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: "Project deleted" });
});

/* -------------------- EXPERIENCE APIs -------------------- */
// Add Experience
app.post("/api/experience", async (req, res) => {
    res.json(await Experience.create(req.body));
});

// Get Experience
app.get("/api/experience", async (req, res) => {
    res.json(await Experience.find());
});

// Update Experience
app.put("/api/experience/:id", async (req, res) => {
    res.json(
        await Experience.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
        })
    );
});

// Delete Experience
app.delete("/api/experience/:id", async (req, res) => {
    await Experience.findByIdAndDelete(req.params.id);
    res.json({ message: "Experience deleted" });
});


app.post("/api/certifications", upload.single("image"), async (req, res) => {
    try {
        let imageUrl;

        if (req.file) {
            const uploadRes = await uploadToCloudinary(
                req.file.buffer,
                "portfolio/certifications"
            );
            imageUrl = uploadRes.secure_url;
        }

        const cert = await Certification.create({
            ...req.body,
            image: imageUrl,
        });

        res.json(cert);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/certifications", async (req, res) => {
    res.json(await Certification.find());
});

app.delete("/api/certifications/:id", async (req, res) => {
    await Certification.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
});

app.post("/api/contact", async (req, res) => {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: "All fields required" });
    }

    await Contact.create({ name, email, phone, message });

    res.json({ success: true, message: "Message sent successfully" });
});

app.get("/api/contact", async (req, res) => {
    const contacts = await Contact.find().sort({ createdAt: -1 });
    res.json(contacts);
});


app.post("/api/testimonials", async (req, res) => {
    const testimonial = await Testimonial.create(req.body);
    res.json(testimonial);
});
app.put("/api/testimonials/:id", async (req, res) => {
    const updated = await Testimonial.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
    );
    res.json(updated);
});
app.delete("/api/testimonials/:id", async (req, res) => {
    await Testimonial.findByIdAndDelete(req.params.id);
    res.json({ message: "Testimonial deleted" });
});


app.get("/api/testimonials", async (req, res) => {
    const testimonials = await Testimonial.find().sort({ createdAt: -1 });
    res.json(testimonials);
});

/* -------------------- Server -------------------- */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
