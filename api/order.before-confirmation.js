export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const order = req.body;

    if (!order?.customer?.name ||
        !order?.customer?.address1 ||
        !order?.customer?.city ||
        !order?.customer?.state ||
        !order?.customer?.zip ||
        !order?.customer?.phone ||
        !order?.customer?.email ||
        !Array.isArray(order.items) ||
        order.items.length === 0) {
      return res.status(400).json({
        error: "Missing required order information."
      });
    }

    const lines = order.items.map(item => {
      const tier = item.tier || "Selected package";
      const price = Number(item.price || 0);
      const quantity = Number(item.qty || 1);

      return `
        <li>
          <strong>${escapeHtml(item.name)}</strong><br>
          ${escapeHtml(tier)} × ${quantity}
          — $${(price * quantity).toFixed(2)}
        </li>
      `;
    }).join("");

    const total = Number(order.total || 0).toFixed(2);

    const customer = order.customer;

    const html = `
      <h1>🔥 New Lab²Table Order</h1>

      <h2>Customer</h2>
      <p>
        <strong>Name:</strong> ${escapeHtml(customer.name)}<br>
        <strong>Phone:</strong> ${escapeHtml(customer.phone)}<br>
        <strong>Email:</strong> ${escapeHtml(customer.email)}
      </p>

      <h2>Delivery Address</h2>
      <p>
        ${escapeHtml(customer.address1)}<br>
        ${customer.address2 ? escapeHtml(customer.address2) + "<br>" : ""}
        ${escapeHtml(customer.city)}, ${escapeHtml(customer.state)}
        ${escapeHtml(customer.zip)}
      </p>

      <h2>Order</h2>
      <ul>${lines}</ul>

      <p>
        <strong>Promo:</strong>
        ${order.promo ? escapeHtml(order.promo) : "None"}
      </p>

      <h2>Total: $${total}</h2>

      <p>
        This is an order request. Payment has not been collected.
      </p>
    `;

    const resend = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Lab²Table Orders <onboarding@resend.dev>",
        to: ["solidstatezach@gmail.com"],
        subject: `🔥 Lab²Table Order — ${customer.name}`,
        html
      })
    });

    const result = await resend.json();

    if (!resend.ok) {
      console.error("Resend error:", result);
      return res.status(500).json({
        error: "Unable to send order email."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order received."
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Server error."
    });
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
