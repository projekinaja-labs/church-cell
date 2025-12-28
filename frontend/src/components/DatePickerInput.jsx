import { forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { FiCalendar } from 'react-icons/fi';

// Custom input component with calendar icon
const CustomInput = forwardRef(({ value, onClick, placeholder, className }, ref) => (
    <div className="date-picker-wrapper">
        <input
            type="text"
            className={className || "form-input"}
            value={value}
            onClick={onClick}
            readOnly
            placeholder={placeholder || "Select date"}
            ref={ref}
        />
        <FiCalendar className="date-picker-icon" onClick={onClick} />
    </div>
));

CustomInput.displayName = 'CustomInput';

export default function DatePickerInput({
    selectedDate,
    onChange,
    placeholder,
    className,
    dateFormat = "yyyy-MM-dd",
    ...props
}) {
    // Convert string date to Date object if needed
    const dateValue = selectedDate ? (typeof selectedDate === 'string' ? new Date(selectedDate) : selectedDate) : null;

    const handleChange = (date) => {
        if (onChange) {
            // Return ISO date string (YYYY-MM-DD) for consistency with input type="date"
            if (date) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                onChange(`${year}-${month}-${day}`);
            } else {
                onChange('');
            }
        }
    };

    return (
        <DatePicker
            selected={dateValue}
            onChange={handleChange}
            customInput={<CustomInput className={className} placeholder={placeholder} />}
            dateFormat={dateFormat}
            popperPlacement="bottom-start"
            showPopperArrow={false}
            portalId="datepicker-portal"
            {...props}
        />
    );
}
