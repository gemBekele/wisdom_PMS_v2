import bcrypt from 'bcryptjs';

/**
 * Hash a password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
export const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
};

/**
 * Compare password with hash
 * @param {string} enteredPassword - Plain text password
 * @param {string} hashedPassword - Hashed password
 * @returns {Promise<boolean>} - True if passwords match
 */
export const comparePassword = async (enteredPassword, hashedPassword) => {
    return bcrypt.compare(enteredPassword, hashedPassword);
};

/**
 * Position enum values mapping (Prisma enum to display string)
 */
export const POSITION_MAP = {
    'CEO': 'CEO',
    'Area_Manager': 'Area Manager',
    'Branch_Manager': 'Branch Manager',
    'Operation_Supervisor': 'Operation Supervisor',
    'Customer_Service_Officer_I': 'Customer Service Officer I',
    'Customer_Service_Officer_II': 'Customer Service Officer II',
    'Customer_Relationship_Supervisor': 'Customer Relationship Supervisor',
    'Sales_Marketing_Officer_I': 'Sales & Marketing Officer I',
    'Customer_Relationship_Officer_I': 'Customer Relationship Officer I',
    'Internal_Auditor': 'Internal Auditor',
};

/**
 * Position string to enum value mapping
 */
export const POSITION_TO_ENUM = {
    'CEO': 'CEO',
    'Area Manager': 'Area_Manager',
    'Branch Manager': 'Branch_Manager',
    'Operation Supervisor': 'Operation_Supervisor',
    'Customer Service Officer I': 'Customer_Service_Officer_I',
    'Customer Service Officer II': 'Customer_Service_Officer_II',
    'Customer Relationship Supervisor': 'Customer_Relationship_Supervisor',
    'Sales & Marketing Officer I': 'Sales_Marketing_Officer_I',
    'Customer Relationship Officer I': 'Customer_Relationship_Officer_I',
    'Internal Auditor': 'Internal_Auditor',
};

/**
 * KPI Category mapping
 */
export const KPI_CATEGORY_MAP = {
    'Deposit_Mobilization': 'Deposit Mobilization',
    'New_Member_Registration': 'New Member Registration',
    'New_Account_Opening': 'New Account Opening',
    'Share_Capital_Growth': 'Share Capital Growth',
    'Account_Productivity': 'Account Productivity',
    'Mobile_Banking_Users': 'Mobile Banking Users',
    'Merchant_POS_Growth': 'Merchant POS Growth',
    'Billers_Recruitment': 'Billers Recruitment',
    'Internal_Operations': 'Internal Operations',
    'Collection_Rate': 'Collection Rate',
    'Portfolio_Quality': 'Portfolio Quality',
};

export const KPI_CATEGORY_TO_ENUM = {
    'Deposit Mobilization': 'Deposit_Mobilization',
    'New Member Registration': 'New_Member_Registration',
    'New Account Opening': 'New_Account_Opening',
    'Share Capital Growth': 'Share_Capital_Growth',
    'Account Productivity': 'Account_Productivity',
    'Mobile Banking Users': 'Mobile_Banking_Users',
    'Merchant POS Growth': 'Merchant_POS_Growth',
    'Billers Recruitment': 'Billers_Recruitment',
    'Internal Operations': 'Internal_Operations',
    'Collection Rate': 'Collection_Rate',
    'Portfolio Quality': 'Portfolio_Quality',
};

/**
 * Task Type mapping (Ghion SACCOS)
 * Maps display names and legacy names to new enum values
 */
export const TASK_TYPE_TO_ENUM = {
    'Loan Saving Deposit': 'Loan_Saving_Deposit',
    'Michu Current Saving': 'Michu_Current_Saving',
    'Gihon Regular Saving': 'Gihon_Regular_Saving',
    'Mothers Saving': 'Mothers_Saving',
    'Young Womens Saving': 'Young_Womens_Saving',
    'Elders Saving': 'Elders_Saving',
    'Children Saving': 'Children_Saving',
    'Fixed Time Deposit': 'Fixed_Time_Deposit',
    'Premium Saving Deposit': 'Premium_Saving_Deposit',
    'Special Saving': 'Special_Saving',
    'Segment Deposit': 'Segment_Deposit',
    'Wadiah IFB Deposit': 'Wadiah_IFB_Deposit',
    'Deposit Mobilization': 'Deposit_Mobilization',
    'New Member Registration': 'New_Member_Registration',
    'New Account Opening': 'New_Account_Opening',
    'Share Capital Growth': 'Share_Capital_Growth',
    'Account Productivity': 'Account_Productivity',
    'Mobile Banking Users': 'Mobile_Banking_Users',
    'Merchant POS Growth': 'Merchant_POS_Growth',
    'Billers Recruitment': 'Billers_Recruitment',
    'Internal Operations': 'Internal_Operations',
    'Collection Rate': 'Collection_Rate',
    'Portfolio Quality': 'Portfolio_Quality',
};

export const TASK_TYPE_MAP = {
    'Loan_Saving_Deposit': 'Loan Saving Deposit',
    'Michu_Current_Saving': 'Michu Current Saving',
    'Gihon_Regular_Saving': 'Gihon Regular Saving',
    'Mothers_Saving': 'Mothers Saving',
    'Young_Womens_Saving': 'Young Womens Saving',
    'Elders_Saving': 'Elders Saving',
    'Children_Saving': 'Children Saving',
    'Fixed_Time_Deposit': 'Fixed Time Deposit',
    'Premium_Saving_Deposit': 'Premium Saving Deposit',
    'Special_Saving': 'Special Saving',
    'Segment_Deposit': 'Segment Deposit',
    'Wadiah_IFB_Deposit': 'Wadiah IFB Deposit',
    'Deposit_Mobilization': 'Deposit Mobilization',
    'New_Member_Registration': 'New Member Registration',
    'New_Account_Opening': 'New Account Opening',
    'Share_Capital_Growth': 'Share Capital Growth',
    'Account_Productivity': 'Account Productivity',
    'Mobile_Banking_Users': 'Mobile Banking Users',
    'Merchant_POS_Growth': 'Merchant POS Growth',
    'Billers_Recruitment': 'Billers Recruitment',
    'Internal_Operations': 'Internal Operations',
    'Collection_Rate': 'Collection Rate',
    'Portfolio_Quality': 'Portfolio Quality',
};

/**
 * Account Type mapping
 */
export const ACCOUNT_TYPE_TO_ENUM = {
    'Savings': 'Savings',
    'Current': 'Current',
    'Fixed Deposit': 'Fixed_Deposit',
    'Recurring Deposit': 'Recurring_Deposit',
    'Loan': 'Loan',
};

export const ACCOUNT_TYPE_MAP = {
    'Savings': 'Savings',
    'Current': 'Current',
    'Fixed_Deposit': 'Fixed Deposit',
    'Recurring_Deposit': 'Recurring Deposit',
    'Loan': 'Loan',
};

export const PAYMENT_FREQUENCY_MAP = {
    'Daily': 'Daily',
    'Weekly': 'Weekly',
    'Monthly': 'Monthly',
};

/**
 * CBS product name → product category mapping
 * Maps actual CBS product names (from Accounts.csv) to product categories used in plans
 */
export const CBS_PRODUCT_TO_CATEGORY = {
    'LOAN SAVING RESERVE ACCOUNT': 'Loan_Saving_Deposit',
    'Michu Current Account': 'Michu_Current_Saving',
    'GIHON REGULAR SAVING': 'Gihon_Regular_Saving',
    'MOTHERS SAVING ACCOUNT': 'Mothers_Saving',
    'YOUNG WOMEN SAVING': 'Young_Womens_Saving',
    'ELDERS SAVING ACCOUNT': 'Elders_Saving',
    'CHILDREN SAVING ACCOUNT': 'Children_Saving',
    'FIXED TIME DEPOSIT': 'Fixed_Time_Deposit',
    'Premium Saving Deposit': 'Premium_Saving_Deposit',
    'Premium Saving': 'Premium_Saving_Deposit',
    'SPECIAL SAVING ACCOUNT': 'Special_Saving',
    'Segment Account': 'Segment_Deposit',
    'WADIAH SAVING ACCOUNT': 'Wadiah_IFB_Deposit',
    'School': 'Children_Saving',
};

/**
 * Product category → parent KPI category mapping
 * All deposit product categories map to Deposit_Mobilization KPI
 */
export const PRODUCT_CATEGORY_TO_KPI = {
    'Loan_Saving_Deposit': 'Deposit_Mobilization',
    'Michu_Current_Saving': 'Deposit_Mobilization',
    'Gihon_Regular_Saving': 'Deposit_Mobilization',
    'Mothers_Saving': 'Deposit_Mobilization',
    'Young_Womens_Saving': 'Deposit_Mobilization',
    'Elders_Saving': 'Deposit_Mobilization',
    'Children_Saving': 'Deposit_Mobilization',
    'Fixed_Time_Deposit': 'Deposit_Mobilization',
    'Premium_Saving_Deposit': 'Deposit_Mobilization',
    'Special_Saving': 'Deposit_Mobilization',
    'Segment_Deposit': 'Deposit_Mobilization',
    'Wadiah_IFB_Deposit': 'Deposit_Mobilization',
};

export const INSTALLMENT_STATUS_MAP = {
    'Pending': 'Pending',
    'Paid': 'Paid',
    'Partial': 'Partial',
    'Missed': 'Missed',
};

/**
 * Mapping Status
 */
export const MAPPING_STATUS_TO_ENUM = {
    'Mapped to You': 'Mapped_to_You',
    'Mapped to Another Staff': 'Mapped_to_Another_Staff',
    'Unmapped': 'Unmapped',
};

export const MAPPING_STATUS_MAP = {
    'Mapped_to_You': 'Mapped to You',
    'Mapped_to_Another_Staff': 'Mapped to Another Staff',
    'Unmapped': 'Unmapped',
};

/**
 * Approval Status
 */
export const APPROVAL_STATUS_TO_ENUM = {
    'Pending': 'Pending',
    'Approved': 'Approved',
    'Rejected': 'Rejected',
    'Requested Edit': 'Requested_Edit',
};

export const APPROVAL_STATUS_MAP = {
    'Pending': 'Pending',
    'Approved': 'Approved',
    'Rejected': 'Rejected',
    'Requested_Edit': 'Requested Edit',
};

/**
 * Audit Action mapping
 */
export const AUDIT_ACTION_TO_ENUM = {
    'Plan Upload': 'Plan_Upload',
    'Plan Update': 'Plan_Update',
    'User Created': 'User_Created',
    'User Updated': 'User_Updated',
    'User Deleted': 'User_Deleted',
    'Mapping Updated': 'Mapping_Updated',
    'Mapping Created': 'Mapping_Created',
    'Task Created': 'Task_Created',
    'Task Approved': 'Task_Approved',
    'Task Rejected': 'Task_Rejected',
    'Approval': 'Approval',
    'KPI Framework Updated': 'KPI_Framework_Updated',
    'Competency Framework Updated': 'Competency_Framework_Updated',
    'CBS Upload': 'CBS_Upload',
    'CBS Validation': 'CBS_Validation',
    'Behavioral Evaluation': 'Behavioral_Evaluation',
    'Password Reset': 'Password_Reset',
    'Login': 'Login',
    'Logout': 'Logout',
    'Edit Requested': 'Edit_Requested',
    'Edit Approved': 'Edit_Approved',
    'Edit Rejected': 'Edit_Rejected',
    'Balance Source Updated': 'Balance_Source_Updated',
};

/**
 * Discrepancy Type mapping
 */
export const DISCREPANCY_TYPE_TO_ENUM = {
    'Amount Mismatch': 'Amount_Mismatch',
    'Missing in CBS': 'Missing_in_CBS',
    'Missing in PMS': 'Missing_in_PMS',
    'Account Mismatch': 'Account_Mismatch',
};
