const db = require("../config/db");

exports.getDashboardData = async (req, res) => {
  try {
    // --- Fetch Population ---
    const [populationRow] = await db.query(
      `SELECT * FROM population 
       WHERE indicators = 'population1' 
       ORDER BY year DESC 
       LIMIT 1`
    );

    if (populationRow.length === 0) {
      return res.status(404).json({ message: "No population data found." });
    }

    const { q1: pop_q1, q2: pop_q2, q3: pop_q3, q4: pop_q4 } = populationRow[0];

    let totalPopulation = 0;
    if (pop_q4 != null) totalPopulation = pop_q4;
    else if (pop_q3 != null) totalPopulation = pop_q3;
    else if (pop_q2 != null) totalPopulation = pop_q2;
    else if (pop_q1 != null) totalPopulation = pop_q1;

    // --- Fetch Total Revenue ---
    const [revenueRow] = await db.query(
      `SELECT * FROM public_finance_nu_in_million 
       WHERE indicators = 'government_revenue_receipt1' 
       ORDER BY year DESC 
       LIMIT 1`
    );

    if (revenueRow.length === 0) {
      return res.status(404).json({ message: "No revenue data found." });
    }

    const { q1: rev_q1, q2: rev_q2, q3: rev_q3, q4: rev_q4 } = revenueRow[0];

    let totalRevenue = 0;
    if (rev_q4 != null) totalRevenue = rev_q4;
    else if (rev_q3 != null) totalRevenue = rev_q3;
    else if (rev_q2 != null) totalRevenue = rev_q2;
    else if (rev_q1 != null) totalRevenue = rev_q1;

    // --- Fetch Total Debt ---
    const [debtRow] = await db.query(
      `SELECT * FROM public_finance_nu_in_million 
       WHERE indicators = 'total_public_debt_nu_in_million2' 
       ORDER BY year DESC 
       LIMIT 1`
    );

    if (debtRow.length === 0) {
      return res.status(404).json({ message: "No debt data found." });
    }

    const { q1: debt_q1, q2: debt_q2, q3: debt_q3, q4: debt_q4 } = debtRow[0];

    let totalDebt = 0;
    if (debt_q4 != null) totalDebt = debt_q4;
    else if (debt_q3 != null) totalDebt = debt_q3;
    else if (debt_q2 != null) totalDebt = debt_q2;
    else if (debt_q1 != null) totalDebt = debt_q1;

    // --- Fetch GDP ---
    const [gdpRow] = await db.query(
      `SELECT * FROM income 
       WHERE indicators = 'gdp_nu_in_million1' 
       ORDER BY year DESC 
       LIMIT 1`
    );

    if (gdpRow.length === 0) {
      return res.status(404).json({ message: "No GDP data found." });
    }

    const { q1: gdp_q1, q2: gdp_q2, q3: gdp_q3, q4: gdp_q4 } = gdpRow[0];

    let totalGDP = 0;
    if (gdp_q4 != null) totalGDP = gdp_q4;
    else if (gdp_q3 != null) totalGDP = gdp_q3;
    else if (gdp_q2 != null) totalGDP = gdp_q2;
    else if (gdp_q1 != null) totalGDP = gdp_q1;

    // Round values to 2 decimal places
    totalPopulation = parseFloat(totalPopulation).toFixed(2);
    totalRevenue = parseFloat(totalRevenue).toFixed(2);
    totalDebt = parseFloat(totalDebt).toFixed(2);
    totalGDP = parseFloat(totalGDP).toFixed(2);

    // Send the response with all the calculated values
    res.json({
      totalPopulation,
      totalRevenue,
      totalDebt,
      totalGDP,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong." });
  }
};
