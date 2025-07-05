import React, { useState, useEffect } from 'react';

const CompanyForm = ({ company, mode, onSave, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    legalName: '',
    description: '',
    businessType: 'LLC',
    status: 'active',
    taxId: '',
    phone: '',
    email: '',
    website: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA'
    }
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (company && mode === 'edit') {
      setFormData({
        name: company.name || '',
        legalName: company.legalName || '',
        description: company.description || '',
        businessType: company.businessType || 'LLC',
        status: company.status || 'active',
        taxId: company.taxId || '',
        phone: company.phone || '',
        email: company.email || '',
        website: company.website || '',
        address: {
          street: company.address?.street || '',
          city: company.address?.city || '',
          state: company.address?.state || '',
          zipCode: company.address?.zipCode || '',
          country: company.address?.country || 'USA'
        }
      });
    }
  }, [company, mode]);

  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.name.trim()) {
      newErrors.name = 'Company name is required';
    } else if (formData.name.length > 200) {
      newErrors.name = 'Company name must be less than 200 characters';
    }

    // Optional but validated fields
    if (formData.legalName && formData.legalName.length > 200) {
      newErrors.legalName = 'Legal name must be less than 200 characters';
    }

    if (formData.taxId && !/^\d{2}-\d{7}$|^\d{3}-\d{2}-\d{4}$/.test(formData.taxId)) {
      newErrors.taxId = 'Tax ID must be in format XX-XXXXXXX (EIN) or XXX-XX-XXXX (SSN)';
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = 'Website must start with http:// or https://';
    }

    if (formData.phone && !/^\+?[\d\s\-\(\)\.]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }

    // Address validation
    if (formData.address.street && formData.address.street.length > 200) {
      newErrors['address.street'] = 'Street address must be less than 200 characters';
    }

    if (formData.address.city && formData.address.city.length > 100) {
      newErrors['address.city'] = 'City must be less than 100 characters';
    }

    if (formData.address.state && (formData.address.state.length !== 2 || !/^[A-Z]{2}$/.test(formData.address.state))) {
      newErrors['address.state'] = 'State must be a 2-letter state code (e.g., FL)';
    }

    if (formData.address.zipCode && !/^\d{5}(-\d{4})?$/.test(formData.address.zipCode)) {
      newErrors['address.zipCode'] = 'Zip code must be in format XXXXX or XXXXX-XXXX';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const sanitizeFormData = (data) => {
    const sanitized = { ...data };
    
    // Remove empty optional fields to avoid validation issues
    Object.keys(sanitized).forEach(key => {
      if (sanitized[key] === '' || sanitized[key] === null || sanitized[key] === undefined) {
        delete sanitized[key];
      }
    });
    
    // Handle address object
    if (sanitized.address) {
      Object.keys(sanitized.address).forEach(key => {
        if (sanitized.address[key] === '' || sanitized.address[key] === null || sanitized.address[key] === undefined) {
          delete sanitized.address[key];
        }
      });
      
      // Remove address object if empty
      if (Object.keys(sanitized.address).length === 0) {
        delete sanitized.address;
      }
    }
    
    return sanitized;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      const sanitizedData = sanitizeFormData(formData);
      onSave(sanitizedData);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    let processedValue = value;
    
    // Transform state to uppercase
    if (name === 'address.state') {
      processedValue = value.toUpperCase();
    }
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: processedValue
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: processedValue
      }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {mode === 'create' ? 'Add New Company' : 'Edit Company'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {mode === 'create' 
                ? 'Create a new business entity for transaction management'
                : 'Update company information and settings'
              }
            </p>
          </div>

          <div className="px-6 py-4 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">Basic Information</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`input ${errors.name ? 'border-red-500' : ''}`}
                    placeholder="e.g., SHAMDAT CONSTRUCTION"
                    required
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Legal Name
                  </label>
                  <input
                    type="text"
                    name="legalName"
                    value={formData.legalName}
                    onChange={handleInputChange}
                    className={`input ${errors.legalName ? 'border-red-500' : ''}`}
                    placeholder="e.g., SHAMDAT CONSTRUCTION, INC."
                  />
                  {errors.legalName && <p className="text-red-500 text-xs mt-1">{errors.legalName}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="input resize-none"
                  placeholder="Brief description of the business..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Business Type
                  </label>
                  <select
                    name="businessType"
                    value={formData.businessType}
                    onChange={handleInputChange}
                    className="input"
                  >
                    <option value="LLC">LLC</option>
                    <option value="Corp">Corporation</option>
                    <option value="S-Corp">S-Corporation</option>
                    <option value="Partnership">Partnership</option>
                    <option value="Sole Proprietorship">Sole Proprietorship</option>
                    <option value="Non-Profit">Non-Profit</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="input"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tax ID (EIN)
                  </label>
                  <input
                    type="text"
                    name="taxId"
                    value={formData.taxId}
                    onChange={handleInputChange}
                    className={`input ${errors.taxId ? 'border-red-500' : ''}`}
                    placeholder="XX-XXXXXXX or XXX-XX-XXXX"
                  />
                  {errors.taxId && <p className="text-red-500 text-xs mt-1">{errors.taxId}</p>}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">Contact Information</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`input ${errors.phone ? 'border-red-500' : ''}`}
                    placeholder="(555) 123-4567"
                  />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`input ${errors.email ? 'border-red-500' : ''}`}
                    placeholder="contact@company.com"
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    className={`input ${errors.website ? 'border-red-500' : ''}`}
                    placeholder="https://company.com"
                  />
                  {errors.website && <p className="text-red-500 text-xs mt-1">{errors.website}</p>}
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 dark:text-white">Address</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleInputChange}
                  className={`input ${errors['address.street'] ? 'border-red-500' : ''}`}
                  placeholder="7411 NW 23RD ST"
                />
                {errors['address.street'] && <p className="text-red-500 text-xs mt-1">{errors['address.street']}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleInputChange}
                    className={`input ${errors['address.city'] ? 'border-red-500' : ''}`}
                    placeholder="SUNRISE"
                  />
                  {errors['address.city'] && <p className="text-red-500 text-xs mt-1">{errors['address.city']}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleInputChange}
                    className={`input ${errors['address.state'] ? 'border-red-500' : ''}`}
                    placeholder="FL"
                    maxLength={2}
                  />
                  {errors['address.state'] && <p className="text-red-500 text-xs mt-1">{errors['address.state']}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    name="address.zipCode"
                    value={formData.address.zipCode}
                    onChange={handleInputChange}
                    className={`input ${errors['address.zipCode'] ? 'border-red-500' : ''}`}
                    placeholder="33313"
                  />
                  {errors['address.zipCode'] && <p className="text-red-500 text-xs mt-1">{errors['address.zipCode']}</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {mode === 'create' ? 'Creating...' : 'Updating...'}
                </>
              ) : (
                mode === 'create' ? 'Create Company' : 'Update Company'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanyForm;
