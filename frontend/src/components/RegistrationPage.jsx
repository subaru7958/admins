import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/config.js';

const RegistrationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Form state
  const [formData, setFormData] = useState({
    teamName: '',
    discipline: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });
  const [phoneLocal, setPhoneLocal] = useState('');

  // File upload state
  const [teamLogo, setTeamLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  // Validation state
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Available disciplines
  const disciplines = [
    { value: 'Football', label: 'Football', description: 'Soccer team management' },
    { value: 'Natation', label: 'Natation', description: 'Swimming team management' },
    { value: 'Handball', label: 'Handball', description: 'Handball team management' }
  ];

  // Get discipline from URL query parameter
  useEffect(() => {
    const disciplineFromUrl = searchParams.get('pack');
    if (disciplineFromUrl) {
      setFormData(prev => ({ ...prev, discipline: disciplineFromUrl }));
    }
  }, [searchParams]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, teamLogo: 'Please select a valid image file (JPG, PNG, GIF, WebP)' }));
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, teamLogo: 'File size must be less than 5MB. Please choose a smaller image.' }));
        return;
      }

      setTeamLogo(file);
      setErrors(prev => ({ ...prev, teamLogo: '' }));

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setLogoPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    // Team Name validation
    if (!formData.teamName.trim()) {
      newErrors.teamName = 'Team name is required';
    } else if (formData.teamName.trim().length < 2) {
      newErrors.teamName = 'Team name must be at least 2 characters';
    } else if (formData.teamName.trim().length > 50) {
      newErrors.teamName = 'Team name must be less than 50 characters';
    }

    // Discipline validation
    if (!formData.discipline) {
      newErrors.discipline = 'Please select a discipline';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address (e.g., team@example.com)';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (formData.password.length > 128) {
      newErrors.password = 'Password must be less than 128 characters';
    }

    // Confirm Password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match. Please make sure both passwords are identical.';
    }

    // Phone Number validation (Tunisia only: +216 and 8 digits)
    if (!phoneLocal) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{8}$/.test(phoneLocal)) {
      newErrors.phone = 'Enter 8 digits (Tunisia). Example: 50123456';
    }

    // Team Logo validation (optional but if provided, validate)
    if (teamLogo && !teamLogo.type.startsWith('image/')) {
      newErrors.teamLogo = 'Please select a valid image file';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      const payload = { ...formData, phone: phoneLocal ? `+216${phoneLocal}` : '' };
      // Add form fields
      Object.keys(payload).forEach(key => {
        formDataToSend.append(key, payload[key]);
      });

      // Add file if selected
      if (teamLogo) {
        formDataToSend.append('teamLogo', teamLogo);
      }

      // Send POST request to backend
      const response = await fetch(API_ENDPOINTS.REGISTER, {
        method: 'POST',
        body: formDataToSend,
      });

      if (response.ok) {
        const result = await response.json();
        alert('🎉 Registration successful! Welcome to SportManager!');
        navigate('/login');
      } else {
        const errorData = await response.json();
        alert(`❌ Registration failed: ${errorData.message || 'Something went wrong'}`);
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('❌ Registration failed. Please check your internet connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="mb-4 flex justify-start">
          <Link
            to="/"
            className="inline-flex items-center rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
            title="Back to Home"
          >
            ← Back
          </Link>
        </div>
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold text-blue-600 mb-2 block">
            SportManager
          </Link>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Create Your Team Account
          </h2>
          <p className="text-gray-600">
            Join our platform and start managing your team like a pro
          </p>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              💡 <strong>Tip:</strong> All fields marked with * are required. Take your time to fill them out correctly!
            </p>
          </div>
        </div>

        {/* Registration Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Team Name */}
            <div>
              <label htmlFor="teamName" className="block text-sm font-medium text-gray-700 mb-2">
                Team Name * <span className="text-xs text-gray-500">(2-50 characters)</span>
              </label>
              <input
                type="text"
                id="teamName"
                name="teamName"
                value={formData.teamName}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.teamName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your team name (e.g., Thunder Hawks)"
                maxLength={50}
              />
              {errors.teamName && (
                <p className="mt-1 text-sm text-red-600">{errors.teamName}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                
              </p>
            </div>

            {/* Discipline */}
            <div>
              <label htmlFor="discipline" className="block text-sm font-medium text-gray-700 mb-2">
                Sport Discipline * <span className="text-xs text-gray-500">(Select your sport)</span>
              </label>
              <select
                id="discipline"
                name="discipline"
                value={formData.discipline}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.discipline ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select a discipline</option>
                {disciplines.map(discipline => (
                  <option key={discipline.value} value={discipline.value}>
                    {discipline.label} - {discipline.description}
                  </option>
                ))}
              </select>
              {errors.discipline && (
                <p className="mt-1 text-sm text-red-600">{errors.discipline}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                
              </p>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Team Email * <span className="text-xs text-gray-500">(Used for login)</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="team@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                
              </p>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password * <span className="text-xs text-gray-500">(6+ characters)</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Create a strong password"
                  maxLength={128}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password * <span className="text-xs text-gray-500">(Must match)</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Re-enter your password"
                  maxLength={128}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? "🙈" : "👁️"}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                
              </p>
            </div>

            {/* Phone Number (Tunisia only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number * <span className="text-xs text-gray-500">(Tunisia only)</span>
              </label>
              <div className={`flex items-stretch rounded-md border ${errors.phone ? 'border-red-500' : 'border-gray-300'} overflow-hidden bg-white dark:bg-gray-900 dark:border-gray-600`}>
                <span className="inline-flex items-center gap-2 px-3 text-sm bg-gray-50 border-r border-gray-300 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100">
                  <span role="img" aria-label="Tunisia">🇹🇳</span>
                  +216
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={8}
                  value={phoneLocal}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/[^\d]/g, '').slice(0, 8);
                    setPhoneLocal(digits);
                  }}
                  className="flex-1 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100"
                  placeholder="50123456"
                  aria-label="Tunisian local number (8 digits)"
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">We only support Tunisian numbers (+216). Enter 8 digits.</p>
            </div>

            {/* Team Logo Upload */}
            <div>
              <label htmlFor="teamLogo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Team Logo <span className="text-xs text-gray-500">(Optional - Max 5MB)</span>
              </label>
              <input
                type="file"
                id="teamLogo"
                name="teamLogo"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:text-gray-100 dark:border-gray-600"
              />
              {errors.teamLogo && (
                <p className="mt-1 text-sm text-red-600">{errors.teamLogo}</p>
              )}
              
              {/* Logo Preview */}
              {logoPreview && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Logo Preview:</p>
                  <img
                    src={logoPreview}
                    alt="Team logo preview"
                    className="w-24 h-24 object-cover rounded-md border border-gray-300"
                  />
                </div>
              )}
              
              <p className="mt-1 text-xs text-gray-500">
                💡 Upload your team logo (JPG, PNG, GIF, WebP). This will appear on your team profile.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-md transition-colors duration-200"
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign in here
              </Link>
            </p>
          </div>

          {/* Help Section */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Need Help?</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Make sure all required fields (*) are filled</li>
              <li>• Use a strong password with 6+ characters</li>
              <li>• Ensure your email is valid and accessible</li>
              <li>• Phone number should include country code if international</li>
              <li>• Logo file should be an image under 5MB</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationPage; 