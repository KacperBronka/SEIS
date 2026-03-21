using System;
using System.Net.Http;
using System.Threading.Tasks;
using System.Windows;
using System.Text;
using System.Text.Json;

namespace Discord_clone
{
	
	public class VerifyAgeResponse
	{
		public string error { get; set; }
		public bool age_check { get; set; }
	}

	public partial class MainWindow : Window
	{
		private static readonly HttpClient _httpClient =
			new HttpClient { Timeout = TimeSpan.FromSeconds(75) };

		public MainWindow()
		{
			InitializeComponent();
		}

		private async void VerifyButton_Click(object sender, RoutedEventArgs e)
		{
			string code = VerificationCodeInput.Text;
			string metaData = "Discord_clone";
			int ageLimit = 18;

			if (string.IsNullOrWhiteSpace(code))
			{
				MessageBox.Show("Podaj kod!");
				return;
			}

			if (code.Length != 6)
			{
				MessageBox.Show("Kod musi mieć dokładnie 6 znaków");
				VerificationCodeInput.Text = "";
				return;
			}

			VerifyButton.IsEnabled = false;
			LoadingPanel.Visibility = Visibility.Visible;

			
			VerifyAgeResponse result = await CallServerGet(ageLimit, code, metaData);

			if (result.age_check)
			{
				DialogResult = true;
				Close();
			}
			else
			{
				MessageBox.Show($"Błąd weryfikacji: ");

				DialogResult = false;
				VerifyButton.IsEnabled = true;
				LoadingPanel.Visibility = Visibility.Collapsed;
			}
		}

		
		private async Task<VerifyAgeResponse> CallServerGet(int requestedAge, string code, string meta)
		{
			try
			{
				string url = "http://192.168.88.250/users/verify-age";

			
				var requestData = new
				{
					requested_age = requestedAge,
					code = code,
					meta = meta
				};

				string json = JsonSerializer.Serialize(requestData);
				var content = new StringContent(json, Encoding.UTF8, "application/json");

			
				HttpResponseMessage response = await _httpClient.PostAsync(url, content);

			
				if (!response.IsSuccessStatusCode)
				{
					return new VerifyAgeResponse
					{
						age_check = false,
						error = $"HTTP Error: {response.StatusCode}"
					};
				}

				string responseJson = await response.Content.ReadAsStringAsync();

				if (string.IsNullOrWhiteSpace(responseJson))
				{
					return new VerifyAgeResponse
					{
						age_check = false,
						error = "Brak danych w odpowiedzi serwera"
					};
				}

				
				var result = JsonSerializer.Deserialize<VerifyAgeResponse>(responseJson);

				
				if (result == null)
				{
					return new VerifyAgeResponse
					{
						age_check = false,
						error = "Niepoprawna odpowiedź serwera"
					};
				}

				return result;
			}
			catch (Exception ex)
			{
				return new VerifyAgeResponse
				{
					age_check = false,
					error = "Błąd połączenia z serwerem"
				};
			}
		}
	}
}