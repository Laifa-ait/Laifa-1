import re

with open('src/pages/Public/Home.tsx', 'r') as f:
    text = f.read()

# 1. We need to split the file up based on the parts.
# Let's locate the pieces

start_pour_vous = text.find("      {/* Recommended Section (Point 4) - Framed Beautifully */}")
end_pour_vous = text.find("      {/* Brand Carousel: Redesigned Dynamic Boutiques & Marques Section */}")

pour_vous_block = text[start_pour_vous:end_pour_vous]

start_brands = text.find("      {/* Brand Carousel: Redesigned Dynamic Boutiques & Marques Section */}")
end_brands = text.find("      {/* Social Proof: Ultra-Compact Minimalist Banner */}")
brands_block = text[start_brands:end_brands]

start_social = text.find("      {/* Social Proof: Ultra-Compact Minimalist Banner */}")
end_social = text.find("      {/* Admin Selection / Featured - RE-BRANDED INSPIRED BY HIGH-JEWELRY & FINE COUTURING SITES */}")
social_block = text[start_social:end_social]

start_premium = text.find("      {/* Admin Selection / Featured - RE-BRANDED INSPIRED BY HIGH-JEWELRY & FINE COUTURING SITES */}")
end_premium = text.find("    </div>\n  );\n};")
premium_block = text[start_premium:end_premium]


voir_encore_block = """
      {/* Voir Encore Section */}
      <section className="py-12 bg-[#FAF8F5] relative overflow-hidden border-t border-[#EBE5DF]/60">
        <div className="w-full max-w-[90rem] mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between items-start gap-4 mb-8">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold text-[#121315] font-serif tracking-tight flex items-center gap-2">
                <Eye className="w-6 h-6 text-[#121315]/50" />
                {t("home.voir_encore") || "À Découvrir"}
              </h3>
              <p className="text-sm font-medium text-[#121315]/60 mt-2 max-w-xl">
                 {t("home.voir_encore_desc") || "Continuez votre exploration avec ces recommandations spécialement pensées pour vous."}
              </p>
            </div>
            
            <button 
              onClick={() => navigate('/shop')}
              className="flex items-center gap-2 text-sm font-bold text-[#F37021] hover:text-orange-600 cursor-pointer px-4 py-2 bg-white border border-[#EBE5DF] rounded-lg hover:bg-stone-50 transition-colors shadow-sm"
            >
              <span>{t("Voir Plus") || "Voir tout"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
            {featuredProducts.slice().reverse().slice(0, 10).map((product, idx) => (
              <ProductCard
                key={product.id}
                product={product}
                index={idx}
                sectionStyle="bg-white rounded-[1.5rem] shadow-[0_4px_15px_rgba(44,30,22,0.03)] border border-[#EBE5DF]/60 hover:shadow-lg transition-all"
                onClick={(p) => navigate(`/product/${p.id}`)}
              />
            ))}
          </div>
        </div>
      </section>
"""

new_text = text[:start_pour_vous] + \
           premium_block + \
           pour_vous_block + \
           brands_block + \
           social_block + \
           voir_encore_block + \
           "    </div>\n  );\n};\n"

if (len(premium_block) > 0 and len(pour_vous_block) > 0):
    with open('src/pages/Public/Home.tsx', 'w') as f:
        f.write(new_text)
    print("Done")
else:
    print("Error finding blocks")
