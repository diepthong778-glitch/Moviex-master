export const PLAN_OPTIONS = [
  {
    key: 'BASIC',
    packageId: 'BASIC',
    name: 'Goi Co Ban',
    price: 10000,
    description: 'Phu hop de vao MovieX nhanh voi chi phi ao thap.',
    features: ['Kho phim co ban', '1 thiet bi', 'Chat luong HD'],
  },
  {
    key: 'STANDARD',
    packageId: 'STANDARD',
    name: 'Goi Tieu Chuan',
    price: 49000,
    description: 'Mo rong danh muc phim va uu tien xem tren nhieu thiet bi hon.',
    features: ['Kho BASIC + STANDARD', '2 thiet bi', 'Ho tro uu tien'],
  },
  {
    key: 'PREMIUM',
    packageId: 'PREMIUM',
    name: 'Goi Cao Cap',
    price: 99000,
    description: 'Mo khoa toan bo MovieX voi trai nghiem xem cao cap nhat.',
    features: ['Toan bo noi dung', '4 thiet bi', 'Chat luong toi da'],
  },
];

export const formatVnd = (value) => {
  const numericValue = Number(value || 0);
  return `${new Intl.NumberFormat('vi-VN').format(numericValue)} đ`;
};

export const buildQrCodeImageUrl = (payloadUrl) => {
  if (!payloadUrl) return '';
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(payloadUrl)}`;
};

export const resolvePlanOption = (planKey) => {
  if (!planKey) return null;
  return PLAN_OPTIONS.find((plan) => plan.key === String(planKey).toUpperCase()) || null;
};

export const resolveTargetLabel = (transaction) => {
  if (!transaction) return '';
  if (transaction.targetType === 'MOVIE') {
    return 'Thanh toan phim le';
  }
  return `Thanh toan goi ${transaction.packageId || transaction.planType || ''}`.trim();
};
