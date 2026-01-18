import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2, CheckCircle } from 'lucide-react';

interface CompanyInfoSectionProps {
  companyName: string;
  contactPerson: string;
  setContactPerson: (name: string) => void;
  phoneNumber: string;
  setPhoneNumber: (phone: string) => void;
  email: string;
  setEmail: (email: string) => void;
  contactRole: string;
  setContactRole: (role: string) => void;
  organizationSize: string;
  setOrganizationSize: (size: string) => void;
  hiringUrgency: 'Immediately' | 'Can Wait';
  setHiringUrgency: (urgency: 'Immediately' | 'Can Wait') => void;
  hiringFrequency: string;
  setHiringFrequency: (freq: string) => void;
  jobAddress: string;
  setJobAddress: (address: string) => void;
  isVerified: boolean;
}

const contactRoles = ['Owner', 'HR Manager', 'Hiring Manager', 'Recruiter', 'Team Lead', 'Other'];
const orgSizes = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];
const frequencies = ['One-time', 'Occasionally', 'Regularly', 'Frequently'];

export const CompanyInfoSection = ({
  companyName,
  contactPerson,
  setContactPerson,
  phoneNumber,
  setPhoneNumber,
  email,
  setEmail,
  contactRole,
  setContactRole,
  organizationSize,
  setOrganizationSize,
  hiringUrgency,
  setHiringUrgency,
  hiringFrequency,
  setHiringFrequency,
  jobAddress,
  setJobAddress,
  isVerified,
}: CompanyInfoSectionProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
          4
        </div>
        <h2 className="text-lg font-semibold">About Your Company</h2>
      </div>

      {/* Company Name (Auto-filled) */}
      <div className="space-y-2">
        <Label>Company Name</Label>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted border">
          <Building2 className="w-5 h-5 text-muted-foreground" />
          <span className="font-medium">{companyName || 'Your Company'}</span>
          {isVerified && (
            <Badge variant="secondary" className="ml-auto gap-1 text-success">
              <CheckCircle className="w-3 h-3" />
              Verified
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Auto-filled from your company profile</p>
      </div>

      {/* Contact Person */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Contact Person Name *</Label>
          <Input
            placeholder="e.g., John Doe"
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Contact Role *</Label>
          <Select value={contactRole} onValueChange={setContactRole}>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {contactRoles.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Contact Details */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Phone Number *</Label>
          <Input
            type="tel"
            placeholder="+91 98765 43210"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Email ID *</Label>
          <Input
            type="email"
            placeholder="hr@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      {/* Organization Size */}
      <div className="space-y-2">
        <Label>Size of Organization</Label>
        <Select value={organizationSize} onValueChange={setOrganizationSize}>
          <SelectTrigger>
            <SelectValue placeholder="Select size" />
          </SelectTrigger>
          <SelectContent>
            {orgSizes.map((size) => (
              <SelectItem key={size} value={size}>
                {size} employees
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Hiring Urgency */}
      <div className="space-y-2">
        <Label>Hiring Urgency</Label>
        <div className="toggle-container">
          <button
            type="button"
            onClick={() => setHiringUrgency('Immediately')}
            className={`toggle-option ${hiringUrgency === 'Immediately' ? 'active' : ''}`}
          >
            Immediately
          </button>
          <button
            type="button"
            onClick={() => setHiringUrgency('Can Wait')}
            className={`toggle-option ${hiringUrgency !== 'Immediately' ? 'active' : ''}`}
          >
            Can Wait
          </button>
        </div>
      </div>

      {/* Hiring Frequency */}
      <div className="space-y-2">
        <Label>Hiring Frequency</Label>
        <Select value={hiringFrequency} onValueChange={setHiringFrequency}>
          <SelectTrigger>
            <SelectValue placeholder="How often do you hire?" />
          </SelectTrigger>
          <SelectContent>
            {frequencies.map((freq) => (
              <SelectItem key={freq} value={freq}>
                {freq}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Job Address */}
      <div className="space-y-2">
        <Label>Job Address</Label>
        <Textarea
          placeholder="Enter the complete address where candidates will work..."
          value={jobAddress}
          onChange={(e) => setJobAddress(e.target.value)}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          This will only be visible to registered candidates
        </p>
      </div>
    </div>
  );
};
