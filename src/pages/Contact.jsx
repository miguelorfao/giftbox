import { useState } from "react";
import { Container, Row, Col, Form, Button } from "react-bootstrap";
import { FaEnvelope, FaGift, FaQuestionCircle } from "react-icons/fa";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "General enquiry",
    message: "",
  });

  const [status, setStatus] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    // Temporary demonstration only.
    // Connect this form to EmailJS or your backend later.
    setStatus(
      "Your form is ready. Email delivery has not been configured yet.",
    );
  }

  return (
    <main className="contact-page">
      <section className="contact-hero">
        <Container>
          <span className="section-eyebrow">WE'RE HERE TO HELP</span>

          <h1>Get in Touch</h1>

          <p>
            Have a question about a hamper, a personalised gift or a larger
            order? We'd love to hear from you.
          </p>
        </Container>
      </section>

      <section className="contact-content section-padding">
        <Container>
          <Row className="g-5">
            <Col lg={5}>
              <div className="contact-information">
                <h2>How Can We Help?</h2>

                <p>
                  Whether you're choosing a gift or planning an order for a
                  group, get in touch and tell us what you need.
                </p>

                <div className="contact-information-item">
                  <FaEnvelope />

                  <div>
                    <h3>Email enquiries</h3>

                    <p>Add your business email address here.</p>
                  </div>
                </div>

                <div className="contact-information-item">
                  <FaGift />

                  <div>
                    <h3>Custom hampers</h3>

                    <p>
                      Tell us about the occasion, your budget and the type of
                      gifts you're looking for.
                    </p>
                  </div>
                </div>

                <div className="contact-information-item">
                  <FaQuestionCircle />

                  <div>
                    <h3>Order questions</h3>

                    <p>
                      Contact us with questions about products, delivery or your
                      order.
                    </p>
                  </div>
                </div>
              </div>
            </Col>

            <Col lg={7}>
              <div className="contact-form-card">
                <h2>Send Us a Message</h2>

                <p>
                  Complete the form below and we'll be ready to connect it to
                  your email service.
                </p>

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Your name</Form.Label>

                    <Form.Control
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter your name"
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Email address</Form.Label>

                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Enquiry type</Form.Label>

                    <Form.Select
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                    >
                      <option>General enquiry</option>
                      <option>Existing order</option>
                      <option>Custom hamper</option>
                      <option>Corporate gifts</option>
                      <option>Delivery question</option>
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>Your message</Form.Label>

                    <Form.Control
                      as="textarea"
                      rows={5}
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="How can we help?"
                      required
                    />
                  </Form.Group>

                  <Button type="submit" className="btn-hamper-primary w-100">
                    Send Enquiry
                  </Button>

                  {status && (
                    <div
                      className="contact-status"
                      role="status"
                      aria-live="polite"
                    >
                      {status}
                    </div>
                  )}
                </Form>
              </div>
            </Col>
          </Row>
        </Container>
      </section>
    </main>
  );
}
