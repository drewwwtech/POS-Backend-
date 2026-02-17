import React, { useState, useEffect } from 'react';
import { salesAPI } from '../services/api';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

function Reports() {
  const [reportType, setReportType] = useState('daily');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, selectedDate, selectedYear, selectedMonth, startDate, endDate]);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    setReportData(null);

    try {
      let response;
      const params = {};

      switch (reportType) {
        case 'daily':
          params.date = selectedDate;
          response = await salesAPI.getDailyReport(params.date);
          break;
        case 'monthly':
          params.year = selectedYear;
          params.month = selectedMonth;
          response = await salesAPI.getMonthlyReport(params.year, params.month);
          break;
        case 'yearly':
          params.year = selectedYear;
          response = await salesAPI.getYearlyReport(params.year);
          break;
        case 'range':
          if (!startDate || !endDate) {
            setError('Please select start and end dates');
            setLoading(false);
            return;
          }
          response = await salesAPI.getRangeReport(startDate, endDate);
          break;
        default:
          break;
      }

      if (response.data) {
        setReportData(response.data);
      }
    } catch (err) {
      setError('Failed to load report: ' + (err.response?.data?.detail || err.message));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount || 0);
  };

  const getMonthName = (month) => {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return months[month - 1] || '';
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Sales Reports</h1>
        <p>View sales analytics and performance</p>
      </div>

      {/* Report Type Selector */}
      <div className="card">
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button
            className={`btn ${reportType === 'daily' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setReportType('daily')}
          >
            Daily
          </button>
          <button
            className={`btn ${reportType === 'monthly' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setReportType('monthly')}
          >
            Monthly
          </button>
          <button
            className={`btn ${reportType === 'yearly' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setReportType('yearly')}
          >
            Yearly
          </button>
          <button
            className={`btn ${reportType === 'range' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setReportType('range')}
          >
            Custom Range
          </button>
        </div>

        {/* Date Inputs */}
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {reportType === 'daily' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="form-control"
              />
            </div>
          )}

          {reportType === 'monthly' && (
            <>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="form-control"
                >
                  {[2024, 2025, 2026, 2027, 2028].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="form-control"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <option key={month} value={month}>{getMonthName(month)}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {reportType === 'yearly' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="form-control"
              >
                {[2024, 2025, 2026, 2027, 2028].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          )}

          {reportType === 'range' && (
            <>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="form-control"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="form-control"
                />
              </div>
            </>
          )}

          <button
            className="btn btn-primary"
            onClick={fetchReport}
          >
            Apply
          </button>
        </div>
      </div>

      {error && (
        <div className="error" style={{ marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="loading">Loading report...</div>
      ) : reportData ? (
        <>
          {/* Summary Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <h3>
                <i className="fas fa-peso-sign" style={{color: '#4a90e2'}}></i>
                Gross Sales
              </h3>
              <p className="stat-value" style={{ color: '#4a90e2' }}>
                {formatCurrency(reportData.gross_sales || reportData.total_sales)}
              </p>
            </div>

            <div className="stat-card">
              <h3>
                <i className="fas fa-coins" style={{color: '#48bb78'}}></i>
                Net Income
              </h3>
              <p className="stat-value" style={{ color: '#48bb78' }}>
                {formatCurrency(reportData.net_income || 0)}
              </p>
            </div>

            <div className="stat-card">
              <h3>
                <i className="fas fa-receipt" style={{color: '#9b59b6'}}></i>
                Transactions
              </h3>
              <p className="stat-value" style={{ color: '#9b59b6' }}>
                {reportData.transaction_count}
              </p>
            </div>

            {reportData.best_day && (
              <div className="stat-card">
                <h3>
                  <i className="fas fa-trophy" style={{color: '#9b59b6'}}></i>
                  Best Day
                </h3>
                <p className="stat-value" style={{ fontSize: '1.2rem' }}>
                  {reportData.best_day.date}<br />
                  <span style={{ fontSize: '1rem' }}>{formatCurrency(reportData.best_day.total)}</span>
                </p>
              </div>
            )}

            {reportData.best_month && (
              <div className="stat-card">
                <h3>
                  <i className="fas fa-trophy" style={{color: '#9b59b6'}}></i>
                  Best Month
                </h3>
                <p className="stat-value" style={{ fontSize: '1.2rem' }}>
                  {getMonthName(reportData.best_month.month)}<br />
                  <span style={{ fontSize: '1rem' }}>{formatCurrency(reportData.best_month.total)}</span>
                </p>
              </div>
            )}
          </div>

          {/* Top Products (Daily/Range) */}
          {reportData.top_products && reportData.top_products.length > 0 && (
            <div className="dashboard-grid">
              <div className="dashboard-section">
                <h2>Top Products</h2>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th style={{ textAlign: 'center' }}>Qty</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.top_products.map((product, index) => (
                        <tr key={index}>
                          <td>{product.product_name}</td>
                          <td style={{ textAlign: 'center' }}>{product.quantity}</td>
                          <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(product.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="dashboard-section">
                <h2>Sales Distribution</h2>
                <div style={{ maxHeight: '300px' }}>
                  <Doughnut
                    data={{
                      labels: reportData.top_products.map(p => p.product_name),
                      datasets: [{
                        data: reportData.top_products.map(p => p.total),
                        backgroundColor: [
                          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
                        ],
                      }]
                    }}
                    options={{ maintainAspectRatio: false }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Daily Breakdown (Monthly) */}
          {reportData.daily_breakdown && reportData.daily_breakdown.length > 0 && (
            <div className="dashboard-section" style={{ marginTop: '20px' }}>
              <h2>Daily Breakdown</h2>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th style={{ textAlign: 'center' }}>Transactions</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.daily_breakdown.map((day, index) => (
                      <tr key={index}>
                        <td>{day.date}</td>
                        <td style={{ textAlign: 'center' }}>{day.count}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(day.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Monthly Breakdown (Yearly) */}
          {reportData.monthly_breakdown && reportData.monthly_breakdown.length > 0 && (
            <div className="dashboard-section" style={{ marginTop: '20px' }}>
              <h2>Monthly Breakdown</h2>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th style={{ textAlign: 'center' }}>Transactions</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.monthly_breakdown.map((month, index) => (
                      <tr key={index}>
                        <td>{getMonthName(month.month)}</td>
                        <td style={{ textAlign: 'center' }}>{month.count}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(month.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Hourly Breakdown (Daily) */}
          {reportData.hourly_breakdown && reportData.hourly_breakdown.length > 0 && (
            <div className="dashboard-section" style={{ marginTop: '20px' }}>
              <h2>Hourly Breakdown</h2>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Hour</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.hourly_breakdown.map((hour, index) => (
                      <tr key={index}>
                        <td>{hour.hour}:00</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(hour.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">Select a report type and date to view sales data</div>
      )}
    </div>
  );
}

export default Reports;
