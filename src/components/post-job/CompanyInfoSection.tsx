import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Building2, CheckCircle, Info, Phone, Mail, User, Globe } from 'lucide-react';

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
    <div className="space-y-8">
      {/* Section Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Building2 className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Company & Contact</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Help candidates reach out — add contact details and company info
          </p>
        </div>
      </div>

      {/* Company Name Card */}
      <div className="p-4 rounded-xl bg-muted/50 border-2 border-dashed">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">{companyName || 'Your Company'}</p>
            <p className="text-xs text-muted-foreground">Auto-filled from your company profile</p>
          </div>
          {isVerified && (
            <Badge variant="secondary" className="gap-1 bg-success/10 text-success border-success/20 shrink-0">
              <CheckCircle className="w-3 h-3" />
              Verified
            </Badge>
          )}
        </div>
      </div>

      {/* Contact Person & Role */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <User className="w-4 h-4 text-muted-foreground" />
          Contact Person
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">Full Name *</Label>
            <Input
              placeholder="e.g., John Doe"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Role / Designation *</Label>
            <Select value={contactRole} onValueChange={setContactRole}>
              <SelectTrigger className="h-11">
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
      </div>

      {/* Contact Details */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Phone className="w-4 h-4 text-muted-foreground" />
          Contact Details
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">Phone Number *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="tel"
                placeholder="+91 98765 43210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="h-11 pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Email ID *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="hr@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Organization Details */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Globe className="w-4 h-4 text-muted-foreground" />
          Organization Details
        </h3>

        <div className="space-y-2">
          <Label className="text-sm">Size of Organization</Label>
          <Select value={organizationSize} onValueChange={setOrganizationSize}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Select team size" />
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
      </div>

      {/* Hiring Info */}
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-semibold">Hiring Urgency</Label>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>How urgently do you need to fill this position?</TooltipContent>
            </Tooltip>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(['Immediately', 'Can Wait'] as const).map((urgency) => (
              <button
                key={urgency}
                type="button"
                onClick={() => setHiringUrgency(urgency)}
                className={`relative p-3 rounded-xl border-2 text-sm font-medium text-center transition-all ${
                  hiringUrgency === urgency
                    ? urgency === 'Immediately'
                      ? 'border-destructive bg-destructive/5 text-destructive'
                      : 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:border-primary/40 text-muted-foreground'
                }`}
              >
                {urgency === 'Immediately' ? '🔥 Urgent' : '⏳ Can Wait'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold">Hiring Frequency</Label>
          <Select value={hiringFrequency} onValueChange={setHiringFrequency}>
            <SelectTrigger className="h-11">
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
      </div>

      {/* Job Address */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-semibold">Office Address</Label>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-3.5 h-3.5 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>Only visible to registered candidates</TooltipContent>
          </Tooltip>
        </div>
        <Textarea
          placeholder="Enter the complete address where candidates will work..."
          value={jobAddress}
          onChange={(e) => setJobAddress(e.target.value)}
          rows={3}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          🔒 This will only be visible to registered candidates
        </p>
      </div>
    </div>
  );
};
