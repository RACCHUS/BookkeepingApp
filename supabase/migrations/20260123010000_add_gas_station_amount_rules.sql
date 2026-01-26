-- Add amount-based classification rules for gas stations
-- Small amounts at gas stations are likely food/snacks, larger amounts are fuel

-- Get user_id for the primary user (you can adjust this query as needed)
-- These rules will be inserted as user rules with amount conditions

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the first user (adjust if needed for specific user)
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No users found, skipping rule creation';
    RETURN;
  END IF;

  -- Gas station rules - small amounts = Meals (snacks/drinks)
  -- Pattern: SHELL, CHEVRON, EXXON, BP, etc. under $15 = Meals
  
  -- SHELL - small amount = Meals
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'SHELL', 'contains', 'Meals', 'Gas Station Snacks', 'Shell', 'negative', NULL, 15, 'manual', true)
  ON CONFLICT DO NOTHING;
  
  -- SHELL - large amount = Fuel
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'SHELL', 'contains', 'Car and Truck Expenses', 'Fuel/Gas', 'Shell', 'negative', 15, NULL, 'manual', true)
  ON CONFLICT DO NOTHING;

  -- CHEVRON - small amount = Meals
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'CHEVRON', 'contains', 'Meals', 'Gas Station Snacks', 'Chevron', 'negative', NULL, 15, 'manual', true)
  ON CONFLICT DO NOTHING;
  
  -- CHEVRON - large amount = Fuel
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'CHEVRON', 'contains', 'Car and Truck Expenses', 'Fuel/Gas', 'Chevron', 'negative', 15, NULL, 'manual', true)
  ON CONFLICT DO NOTHING;

  -- EXXON - small amount = Meals
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'EXXON', 'contains', 'Meals', 'Gas Station Snacks', 'Exxon', 'negative', NULL, 15, 'manual', true)
  ON CONFLICT DO NOTHING;
  
  -- EXXON - large amount = Fuel
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'EXXON', 'contains', 'Car and Truck Expenses', 'Fuel/Gas', 'Exxon', 'negative', 15, NULL, 'manual', true)
  ON CONFLICT DO NOTHING;

  -- BP - small amount = Meals
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'BP', 'contains', 'Meals', 'Gas Station Snacks', 'BP', 'negative', NULL, 15, 'manual', true)
  ON CONFLICT DO NOTHING;
  
  -- BP - large amount = Fuel
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'BP', 'contains', 'Car and Truck Expenses', 'Fuel/Gas', 'BP', 'negative', 15, NULL, 'manual', true)
  ON CONFLICT DO NOTHING;

  -- MOBIL - small amount = Meals
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'MOBIL', 'contains', 'Meals', 'Gas Station Snacks', 'Mobil', 'negative', NULL, 15, 'manual', true)
  ON CONFLICT DO NOTHING;
  
  -- MOBIL - large amount = Fuel
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'MOBIL', 'contains', 'Car and Truck Expenses', 'Fuel/Gas', 'Mobil', 'negative', 15, NULL, 'manual', true)
  ON CONFLICT DO NOTHING;

  -- CIRCLE K - small amount = Meals
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'CIRCLE K', 'contains', 'Meals', 'Gas Station Snacks', 'Circle K', 'negative', NULL, 15, 'manual', true)
  ON CONFLICT DO NOTHING;
  
  -- CIRCLE K - large amount = Fuel
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'CIRCLE K', 'contains', 'Car and Truck Expenses', 'Fuel/Gas', 'Circle K', 'negative', 15, NULL, 'manual', true)
  ON CONFLICT DO NOTHING;

  -- 7-ELEVEN - small amount = Meals
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, '7-ELEVEN', 'contains', 'Meals', 'Gas Station Snacks', '7-Eleven', 'negative', NULL, 15, 'manual', true)
  ON CONFLICT DO NOTHING;
  
  -- 7-ELEVEN - large amount = Fuel
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, '7-ELEVEN', 'contains', 'Car and Truck Expenses', 'Fuel/Gas', '7-Eleven', 'negative', 15, NULL, 'manual', true)
  ON CONFLICT DO NOTHING;

  -- 7 ELEVEN (without hyphen)
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, '7 ELEVEN', 'contains', 'Meals', 'Gas Station Snacks', '7-Eleven', 'negative', NULL, 15, 'manual', true)
  ON CONFLICT DO NOTHING;
  
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, '7 ELEVEN', 'contains', 'Car and Truck Expenses', 'Fuel/Gas', '7-Eleven', 'negative', 15, NULL, 'manual', true)
  ON CONFLICT DO NOTHING;

  -- SPEEDWAY - small amount = Meals
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'SPEEDWAY', 'contains', 'Meals', 'Gas Station Snacks', 'Speedway', 'negative', NULL, 15, 'manual', true)
  ON CONFLICT DO NOTHING;
  
  -- SPEEDWAY - large amount = Fuel
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'SPEEDWAY', 'contains', 'Car and Truck Expenses', 'Fuel/Gas', 'Speedway', 'negative', 15, NULL, 'manual', true)
  ON CONFLICT DO NOTHING;

  -- WAWA - small amount = Meals
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'WAWA', 'contains', 'Meals', 'Gas Station Snacks', 'Wawa', 'negative', NULL, 15, 'manual', true)
  ON CONFLICT DO NOTHING;
  
  -- WAWA - large amount = Fuel
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'WAWA', 'contains', 'Car and Truck Expenses', 'Fuel/Gas', 'Wawa', 'negative', 15, NULL, 'manual', true)
  ON CONFLICT DO NOTHING;

  -- RACETRAC - small amount = Meals
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'RACETRAC', 'contains', 'Meals', 'Gas Station Snacks', 'RaceTrac', 'negative', NULL, 15, 'manual', true)
  ON CONFLICT DO NOTHING;
  
  -- RACETRAC - large amount = Fuel
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'RACETRAC', 'contains', 'Car and Truck Expenses', 'Fuel/Gas', 'RaceTrac', 'negative', 15, NULL, 'manual', true)
  ON CONFLICT DO NOTHING;

  -- QUIKTRIP / QT - small amount = Meals
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'QUIKTRIP', 'contains', 'Meals', 'Gas Station Snacks', 'QuikTrip', 'negative', NULL, 15, 'manual', true)
  ON CONFLICT DO NOTHING;
  
  -- QUIKTRIP - large amount = Fuel
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'QUIKTRIP', 'contains', 'Car and Truck Expenses', 'Fuel/Gas', 'QuikTrip', 'negative', 15, NULL, 'manual', true)
  ON CONFLICT DO NOTHING;

  -- SHEETZ - small amount = Meals
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'SHEETZ', 'contains', 'Meals', 'Gas Station Snacks', 'Sheetz', 'negative', NULL, 15, 'manual', true)
  ON CONFLICT DO NOTHING;
  
  -- SHEETZ - large amount = Fuel
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'SHEETZ', 'contains', 'Car and Truck Expenses', 'Fuel/Gas', 'Sheetz', 'negative', 15, NULL, 'manual', true)
  ON CONFLICT DO NOTHING;

  -- MURPHY USA - small amount = Meals
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'MURPHY', 'contains', 'Meals', 'Gas Station Snacks', 'Murphy USA', 'negative', NULL, 15, 'manual', true)
  ON CONFLICT DO NOTHING;
  
  -- MURPHY USA - large amount = Fuel
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'MURPHY', 'contains', 'Car and Truck Expenses', 'Fuel/Gas', 'Murphy USA', 'negative', 15, NULL, 'manual', true)
  ON CONFLICT DO NOTHING;

  -- ARCO - small amount = Meals
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'ARCO', 'contains', 'Meals', 'Gas Station Snacks', 'ARCO', 'negative', NULL, 15, 'manual', true)
  ON CONFLICT DO NOTHING;
  
  -- ARCO - large amount = Fuel
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'ARCO', 'contains', 'Car and Truck Expenses', 'Fuel/Gas', 'ARCO', 'negative', 15, NULL, 'manual', true)
  ON CONFLICT DO NOTHING;

  -- SUNOCO - small amount = Meals
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'SUNOCO', 'contains', 'Meals', 'Gas Station Snacks', 'Sunoco', 'negative', NULL, 15, 'manual', true)
  ON CONFLICT DO NOTHING;
  
  -- SUNOCO - large amount = Fuel
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'SUNOCO', 'contains', 'Car and Truck Expenses', 'Fuel/Gas', 'Sunoco', 'negative', 15, NULL, 'manual', true)
  ON CONFLICT DO NOTHING;

  -- VALERO - small amount = Meals
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'VALERO', 'contains', 'Meals', 'Gas Station Snacks', 'Valero', 'negative', NULL, 15, 'manual', true)
  ON CONFLICT DO NOTHING;
  
  -- VALERO - large amount = Fuel
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'VALERO', 'contains', 'Car and Truck Expenses', 'Fuel/Gas', 'Valero', 'negative', 15, NULL, 'manual', true)
  ON CONFLICT DO NOTHING;

  -- CITGO - small amount = Meals
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'CITGO', 'contains', 'Meals', 'Gas Station Snacks', 'Citgo', 'negative', NULL, 15, 'manual', true)
  ON CONFLICT DO NOTHING;
  
  -- CITGO - large amount = Fuel
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'CITGO', 'contains', 'Car and Truck Expenses', 'Fuel/Gas', 'Citgo', 'negative', 15, NULL, 'manual', true)
  ON CONFLICT DO NOTHING;

  -- CONOCO / PHILLIPS 66 - small amount = Meals
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'CONOCO', 'contains', 'Meals', 'Gas Station Snacks', 'Conoco', 'negative', NULL, 15, 'manual', true)
  ON CONFLICT DO NOTHING;
  
  -- CONOCO - large amount = Fuel
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'CONOCO', 'contains', 'Car and Truck Expenses', 'Fuel/Gas', 'Conoco', 'negative', 15, NULL, 'manual', true)
  ON CONFLICT DO NOTHING;

  -- PHILLIPS 66 - small amount = Meals
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'PHILLIPS 66', 'contains', 'Meals', 'Gas Station Snacks', 'Phillips 66', 'negative', NULL, 15, 'manual', true)
  ON CONFLICT DO NOTHING;
  
  -- PHILLIPS 66 - large amount = Fuel
  INSERT INTO classification_rules (user_id, pattern, pattern_type, category, subcategory, vendor_name, amount_direction, amount_min, amount_max, source, is_active)
  VALUES (v_user_id, 'PHILLIPS 66', 'contains', 'Car and Truck Expenses', 'Fuel/Gas', 'Phillips 66', 'negative', 15, NULL, 'manual', true)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Created gas station amount-based rules for user %', v_user_id;
END $$;
