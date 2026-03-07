import React, { useState, useEffect } from 'react';
import { deliveriesAPI, productsAPI } from '../services/api';
import jsPDF from 'jspdf';

function DeliveryCalendar() {
  const [deliveries, setDeliveries] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [editingDelivery, setEditingDelivery] = useState(null);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [formData, setFormData] = useState({
    supplier_name: '',
    delivery_date: '',
    status: 'PENDING',
    notes: '',
    items: [],
  });
  const [newItem, setNewItem] = useState({ product: '', quantity: 1, unit: 'PCS' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [deliveriesRes, calendarRes, productsRes] = await Promise.all([
        deliveriesAPI.getAll().catch(() => ({ data: [] })),
        deliveriesAPI.getCalendar().catch(() => ({ data: {} })),
        productsAPI.getAll().catch(() => ({ data: [] })),
      ]);
      setDeliveries(deliveriesRes.data || []);
      setProducts(productsRes.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to load data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return '#f39c12';
      case 'SENT': return '#3498db';
      case 'RECEIVED': return '#4caf50';
      case 'PROBLEM': return '#e74c3c';
      default: return '#999';
    }
  };

  const getStatusBorderColor = (status) => {
    switch (status) {
      case 'PENDING': return '3px solid #f39c12';
      case 'SENT': return '3px solid #3498db';
      case 'RECEIVED': return '3px solid #4caf50';
      case 'PROBLEM': return '3px solid #e74c3c';
      default: return '3px solid #999';
    }
  };

  const getMonthDays = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Add empty days for padding
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Add days of month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getDeliveriesForDate = (date) => {
    if (!date) return [];
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    return deliveries.filter((d) => d.delivery_date === dateStr);
  };

  const openModal = (delivery = null, date = null) => {
    if (delivery) {
      setEditingDelivery(delivery);
      setFormData({
        supplier_name: delivery.supplier_name || '',
        delivery_date: delivery.delivery_date || '',
        status: delivery.status || 'PENDING',
        notes: delivery.notes || '',
        items: delivery.items || [],
      });
    } else {
      setEditingDelivery(null);
      const today = new Date();
      const defaultDate = date || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      setFormData({
        supplier_name: '',
        delivery_date: defaultDate,
        status: 'PENDING',
        notes: '',
        items: [],
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDelivery(null);
    setError(null);
    setNewItem({ product: '', quantity: 1, unit: 'PCS' });
  };

  const closePdfModal = () => {
    setShowPdfModal(false);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation: must have at least one item
    if (formData.items.length === 0) {
      setError('Please add at least one item before saving the delivery.');
      return;
    }

    try {
      if (editingDelivery) {
        await deliveriesAPI.update(editingDelivery.id, formData);
        console.log('Delivery updated successfully:', formData);
      } else {
        await deliveriesAPI.create(formData);
        console.log('Delivery created successfully:', formData);
      }
      closeModal();
      fetchData();
      window.dispatchEvent(new Event('notifications-refresh'));
    } catch (err) {
      console.error('Error saving delivery:', err);
      setError('Failed to save delivery: ' + (err.response?.data?.detail || err.message || err.toString()));
    }
  };

  const handleStatusChange = async (deliveryId, newStatus) => {
    try {
      console.log('Updating status for delivery:', deliveryId, 'to:', newStatus);

      // First update the status
      const updateResponse = await deliveriesAPI.update(deliveryId, { status: newStatus });
      console.log('Status update response:', updateResponse);

      // Then fetch the updated delivery data
      const response = await deliveriesAPI.getById(deliveryId);
      console.log('Get delivery response:', response);

      // Handle both direct data and paginated response formats
      const deliveryData = response.data.results ? response.data.results[0] : response.data;
      console.log('Delivery data to set:', deliveryData);

      if (deliveryData) {
        setSelectedDelivery(deliveryData);
        console.log('Selected delivery updated successfully');
      } else {
        console.error('No delivery data received');
      }

      // Refresh the full list
      fetchData();
      window.dispatchEvent(new Event('notifications-refresh'));
      console.log('Full delivery list refreshed');

    } catch (err) {
      console.error('Error updating status:', err);
      console.error('Error details:', err.response?.data);
      setError('Failed to update status: ' + (err.response?.data?.detail || err.message || err.toString()));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this delivery?')) {
      return;
    }
    try {
      await deliveriesAPI.delete(id);
      setSelectedDelivery(null);
      fetchData();
    } catch (err) {
      setError('Failed to delete delivery');
      console.error(err);
    }
  };

  // Add item to delivery from the add form
  const addItem = () => {
    if (!newItem.product) return;
    setFormData({
      ...formData,
      items: [...formData.items, { product_name: newItem.product, quantity: newItem.quantity, unit: newItem.unit }],
    });
    setNewItem({ product: '', quantity: 1, unit: 'PCS' });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  // PDF Generation
  const generatePDF = (delivery) => {
    console.log('PDF items:', JSON.stringify(delivery.items, null, 2));
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text('Delivery Receipt', 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`Supplier: ${delivery.supplier_name}`, 20, 40);
    doc.text(`Date: ${delivery.delivery_date}`, 20, 50);
    doc.text(`Status: ${delivery.status}`, 20, 60);

    if (delivery.notes) {
      doc.text(`Notes: ${delivery.notes}`, 20, 70);
    }

    // Items table
    let yPos = 85;
    doc.setFontSize(14);
    doc.text('Items:', 20, yPos);
    yPos += 10;

    doc.setFontSize(11);
    doc.text('#', 20, yPos);
    doc.text('Product', 30, yPos);
    doc.text('Qty', 120, yPos);
    doc.text('Type', 145, yPos);
    yPos += 5;
    doc.line(20, yPos, 190, yPos);
    yPos += 8;

    if (delivery.items && delivery.items.length > 0) {
      delivery.items.forEach((item, index) => {
        const productName = item.product_name || item.name || 'Unknown';
        doc.text(`${index + 1}`, 20, yPos);
        doc.text(productName, 30, yPos);
        doc.text(`${item.quantity}`, 120, yPos);
        doc.text(`${item.unit || ''}`, 145, yPos);
        yPos += 8;
      });
    } else {
      doc.text('No items', 30, yPos);
    }

    // Footer
    yPos += 20;
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, yPos);
    doc.text('POS System', 190, yPos, { align: 'right' });

    // Open PDF in modal for preview
    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    setPdfUrl(url);
    setShowPdfModal(true);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  if (loading) {
    return <div className="loading">Loading calendar...</div>;
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>Delivery Calendar</h1>
        <p>Manage deliveries and schedule</p>
      </header>

      {error && <div className="error" style={{ marginBottom: '10px' }}>{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '12px', height: '12px', background: '#3498db', borderRadius: '2px' }}></span> Today</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '12px', height: '12px', background: '#f39c12', borderRadius: '2px' }}></span> Pending</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '12px', height: '12px', background: '#4caf50', borderRadius: '2px' }}></span> Complete</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: '12px', height: '12px', background: '#e74c3c', borderRadius: '2px' }}></span> Problem</span>
        </div>
        <button className="btn btn-success" onClick={() => openModal()}>
          <i className="fas fa-plus"></i> Add Delivery
        </button>
      </div>

      {/* Calendar */}
      <div className="calendar-container">
        <div className="calendar-header">
          <button className="calendar-nav" onClick={prevMonth}>
            <i className="fas fa-chevron-left"></i>
          </button>
          <h2>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
          <button className="calendar-nav" onClick={nextMonth}>
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>

        <div className="calendar-grid">
          <div className="calendar-day-header">Sun</div>
          <div className="calendar-day-header">Mon</div>
          <div className="calendar-day-header">Tue</div>
          <div className="calendar-day-header">Wed</div>
          <div className="calendar-day-header">Thu</div>
          <div className="calendar-day-header">Fri</div>
          <div className="calendar-day-header">Sat</div>

          {getMonthDays(currentDate).map((date, index) => {
            const dayDeliveries = getDeliveriesForDate(date);
            const isToday = date && date.toDateString() === new Date().toDateString();

            return (
              <div
                key={index}
                className={`calendar-day ${!date ? 'empty' : ''} ${isToday ? 'today' : ''}`}
                onClick={() => date && dayDeliveries.length === 0 && openModal(null, date)}
              >
                {date && (
                  <>
                    <span className="day-number">{date.getDate()}</span>
                    <div className="day-deliveries">
                      {dayDeliveries.slice(0, 3).map((delivery) => (
                        <div
                          key={delivery.id}
                          className="delivery-dot"
                          style={{
                            backgroundColor: getStatusColor(delivery.status),
                            border: getStatusBorderColor(delivery.status),
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDelivery(delivery);
                          }}
                          title={`${delivery.supplier_name} - ${delivery.status}`}
                        >
                          {delivery.supplier_name?.substring(0, 3)}
                        </div>
                      ))}
                      {dayDeliveries.length > 3 && (
                        <span className="more-deliveries">+{dayDeliveries.length - 3}</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        {/* Legend moved to toolbar above */}
      </div>

      {/* Delivery Details Panel */}
      {selectedDelivery && (
        <div className="card delivery-details">
          <div className="delivery-details-header">
            <h2>Delivery Details</h2>
            <button className="modal-close" onClick={() => setSelectedDelivery(null)}>×</button>
          </div>

          <div className="delivery-info">
            <div className="info-row">
              <label>Supplier:</label>
              <span>{selectedDelivery.supplier_name}</span>
            </div>
            <div className="info-row">
              <label>Date:</label>
              <span>{selectedDelivery.delivery_date}</span>
            </div>
            <div className="info-row">
              <label>Status:</label>
              <select
                value={selectedDelivery.status}
                onChange={(e) => handleStatusChange(selectedDelivery.id, e.target.value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  background: getStatusColor(selectedDelivery.status) + '20',
                  color: getStatusColor(selectedDelivery.status),
                  fontWeight: 'bold',
                }}
              >
                <option value="PENDING">Pending</option>
                <option value="RECEIVED">Received</option>
                <option value="PROBLEM">Problem</option>
              </select>
            </div>
            {selectedDelivery.notes && (
              <div className="info-row">
                <label>Notes:</label>
                <span>{selectedDelivery.notes}</span>
              </div>
            )}
          </div>

          <h3>Items</h3>
          <div className="table-container">
            {selectedDelivery.items && selectedDelivery.items.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedDelivery.items.map((item, index) => (
                    <tr key={index}>
                      <td>{item.product_name || item.name || 'Unknown'}</td>
                      <td>{item.quantity}</td>
                      <td>{item.unit || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="empty-state">No items</p>
            )}
          </div>

          <div className="delivery-actions">
            <button className="btn btn-primary" onClick={() => openModal(selectedDelivery)}>
              <i className="fas fa-edit"></i> Edit
            </button>
            <button className="btn btn-success" onClick={() => generatePDF(selectedDelivery)}>
              <i className="fas fa-file-pdf"></i> View PDF
            </button>
            <button className="btn btn-danger" onClick={() => handleDelete(selectedDelivery.id)}>
              <i className="fas fa-trash"></i> Delete
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingDelivery ? 'Edit Delivery' : 'Add New Delivery'}</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Supplier Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.supplier_name}
                    onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Delivery Date *</label>
                  <input
                    type="date"
                    className="form-control"
                    value={formData.delivery_date}
                    onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="form-group">
                <label>Add Products</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                  <input
                    type="text"
                    className="form-control"
                    style={{ flex: 1 }}
                    placeholder="Enter product name"
                    value={newItem.product}
                    onChange={(e) => setNewItem({ ...newItem, product: e.target.value })}
                    list="product-suggestions"
                  />
                  <datalist id="product-suggestions">
                    {products.map((p) => (
                      <option key={p.id} value={p.name} />
                    ))}
                  </datalist>
                  <input
                    type="number"
                    className="form-control"
                    min="1"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                    style={{ width: '80px' }}
                  />
                  <select
                    className="form-control"
                    style={{ width: '90px' }}
                    value={newItem.unit}
                    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                  >
                    <option value="PCS">PCS</option>
                    <option value="BOX">BOX</option>
                    <option value="PACK">PACK</option>
                    <option value="CAN">CAN</option>
                    <option value="BOTTLE">BOTTLE</option>
                    <option value="CASE">CASE</option>
                  </select>
                  <button type="button" className="btn btn-primary" onClick={addItem}>
                    Add
                  </button>
                </div>
                {formData.items.length === 0 ? (
                  <p className="empty-state">No items added</p>
                ) : (
                  <div className="items-list">
                    {formData.items.map((item, index) => (
                      <div key={index} className="item-row">
                        <span style={{ flex: 1 }}>{item.product_name}</span>
                        <span style={{ width: '100px', textAlign: 'center' }}>{item.quantity} {item.unit}</span>
                        <button type="button" className="btn btn-danger" onClick={() => removeItem(index)}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  className="form-control"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="2"
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  className="form-control"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="PENDING">Pending</option>
                  <option value="RECEIVED">Received</option>
                  <option value="PROBLEM">Problem</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingDelivery ? 'Update' : 'Add Delivery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {showPdfModal && pdfUrl && (
        <div className="modal-overlay" onClick={closePdfModal}>
          <div className="modal modal-pdf" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delivery PDF Preview</h2>
              <button className="modal-close" onClick={closePdfModal}>×</button>
            </div>
            <div className="modal-body pdf-preview-container">
              <iframe
                src={pdfUrl}
                title="PDF Preview"
                className="pdf-iframe"
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closePdfModal}>
                Close
              </button>
              <a href={pdfUrl} download={`delivery_${selectedDelivery?.id}_${selectedDelivery?.delivery_date}.pdf`} className="btn btn-success">
                <i className="fas fa-download"></i> Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DeliveryCalendar;
