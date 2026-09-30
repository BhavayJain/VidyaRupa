(() => {
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  function assetUrl(value) {
    const source = String(value || '');
    if (/^(https?:|data:|blob:)/i.test(source)) return source;
    return new URL(source.replace(/^\/+/, ''), document.baseURI).href;
  }

  function branchFromRow(row) {
    return {
      ...row,
      mapUrl: row.map_url,
      mapEmbedUrl: row.map_embed_url,
      heroImages: row.hero_images || [],
      admissionStatus: row.admission_status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  function branchToRow(branch) {
    return {
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      email: branch.email,
      map_url: branch.mapUrl,
      map_embed_url: branch.mapEmbedUrl,
      admission_status: branch.admissionStatus,
      description: branch.description,
      facilities: branch.facilities
    };
  }

  function feeFromRow(row) {
    return {
      ...row,
      admissionFee: row.admission_fee,
      monthlyTuition: row.monthly_tuition,
      annualCharges: row.annual_charges,
      transportFee: row.transport_fee
    };
  }

  function feeToRow(fee) {
    return {
      level: fee.level,
      admission_fee: Number(fee.admissionFee),
      monthly_tuition: Number(fee.monthlyTuition),
      annual_charges: Number(fee.annualCharges),
      transport_fee: Number(fee.transportFee || 0),
      note: fee.note
    };
  }

  function bookingFromRow(row) {
    return {
      ...row,
      studentName: row.student_name,
      parentName: row.parent_name,
      preferredDate: row.preferred_date,
      preferredTime: row.preferred_time,
      branchName: row.branch_name,
      adminNote: row.admin_note,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  window.vdData = { escapeHtml, assetUrl, branchFromRow, branchToRow, feeFromRow, feeToRow, bookingFromRow };
})();
